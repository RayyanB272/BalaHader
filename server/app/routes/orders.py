from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from pymongo import ReturnDocument

from app.database import (
    listings_collection,
    businesses_collection,
    orders_collection,
    stock_holds_collection,
    delivery_areas_collection,
    deliveries_collection,
    payments_collection,
)

from app.schemas.order import (
    OrderCreate,
    OrderStatusUpdate
)

from app.utils.dependencies import require_role
from app.services.platform_settings_service import get_commission_rate_bps
from app.services.stock_hold_service import release_hold
from app.services.notification_service import create_notification


router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)


def normalize_datetime(value):
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value


def rollback_reserved_items(items):
    for item in items:
        if ObjectId.is_valid(item["listing_id"]):
            listings_collection.update_one(
                {
                    "_id": ObjectId(item["listing_id"])
                },
                {
                    "$inc": {
                        "reserved_quantity": -item["quantity"]
                    },
                    "$set": {
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )


@router.post("/")
def create_order(
    data: OrderCreate,
    current_user=Depends(require_role("customer"))
):
    if not data.items:
        raise HTTPException(
            status_code=400,
            detail="Order must contain at least one item"
        )

    listing_ids = [
        item.listing_id
        for item in data.items
    ]

    if len(listing_ids) != len(set(listing_ids)):
        raise HTTPException(
            status_code=400,
            detail="Duplicate listings are not allowed in the same order"
        )

    if data.fulfillment_type not in [
        "pickup",
        "delivery"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Fulfillment type must be pickup or delivery"
        )

    now = datetime.now(timezone.utc)

    order_items = []
    business_id = None
    subtotal = 0.0
    earliest_sale_deadline = None

    for item in data.items:
        if not ObjectId.is_valid(
            item.listing_id
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid listing ID"
            )

        listing = listings_collection.find_one({
            "_id": ObjectId(
                item.listing_id
            ),
            "status": "active"
        })

        if not listing:
            raise HTTPException(
                status_code=404,
                detail="Listing not found or unavailable"
            )

        sale_deadline = normalize_datetime(
            listing.get("sale_deadline")
        )

        if (
            sale_deadline
            and sale_deadline <= now
        ):
            raise HTTPException(
                status_code=400,
                detail=f"{listing['title']} is no longer available"
            )

        if (
            earliest_sale_deadline is None
            or (
                sale_deadline
                and sale_deadline
                < earliest_sale_deadline
            )
        ):
            earliest_sale_deadline = sale_deadline

        remaining_quantity = listing.get(
            "remaining_quantity",
            0
        )

        reserved_quantity = listing.get(
            "reserved_quantity",
            0
        )

        available_quantity = (
            remaining_quantity
            - reserved_quantity
        )

        if item.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Item quantity must be greater than 0"
            )

        if available_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough available quantity for {listing['title']}"
            )

        listing_mode = listing.get(
            "fulfillment_type"
        )

        if (
            data.fulfillment_type == "pickup"
            and listing_mode
            not in ["pickup", "both"]
        ):
            raise HTTPException(
                status_code=400,
                detail=f"{listing['title']} does not support pickup"
            )

        if (
            data.fulfillment_type == "delivery"
            and listing_mode
            not in ["delivery", "both"]
        ):
            raise HTTPException(
                status_code=400,
                detail=f"{listing['title']} does not support delivery"
            )

        if business_id is None:
            business_id = listing[
                "business_id"
            ]

        elif listing["business_id"] != business_id:
            raise HTTPException(
                status_code=400,
                detail="All items must belong to the same business"
            )

        line_total = (
            listing["discounted_price"]
            * item.quantity
        )

        subtotal += line_total

        order_items.append({
            "listing_id": item.listing_id,
            "title": listing["title"],
            "category": listing.get(
                "category"
            ),
            "quantity": item.quantity,
            "unit_price": listing[
                "discounted_price"
            ],
            "subtotal": round(
                line_total,
                2
            )
        })

    if not business_id:
        raise HTTPException(
            status_code=400,
            detail="Could not determine business"
        )

    business = None

    if ObjectId.is_valid(
        business_id
    ):
        business = businesses_collection.find_one({
            "_id": ObjectId(
                business_id
            )
        })

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business not found"
        )

    delivery_fee = 0.0
    delivery_area = None

    if data.fulfillment_type == "delivery":
        if not data.delivery_area_id:
            raise HTTPException(
                status_code=400,
                detail="Delivery area is required"
            )

        if not data.delivery_address:
            raise HTTPException(
                status_code=400,
                detail="Delivery address is required"
            )

        if not ObjectId.is_valid(
            data.delivery_area_id
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid delivery area"
            )

        delivery_area = (
            delivery_areas_collection.find_one({
                "_id": ObjectId(
                    data.delivery_area_id
                ),
                "business_id": business_id,
                "is_active": True
            })
        )

        if not delivery_area:
            raise HTTPException(
                status_code=400,
                detail="This business does not deliver to the selected area"
            )

        delivery_fee = float(
            delivery_area.get(
                "delivery_fee",
                0
            )
        )

    commission_rate_bps = (
        get_commission_rate_bps()
    )

    commission_amount = round(
        subtotal
        * commission_rate_bps
        / 10000,
        2
    )

    business_earnings = round(
        subtotal
        - commission_amount
        + delivery_fee,
        2
    )

    total_amount = round(
        subtotal + delivery_fee,
        2
    )

    hold_expires_at = (
        now + timedelta(minutes=15)
    )

    if (
        earliest_sale_deadline
        and earliest_sale_deadline
        < hold_expires_at
    ):
        hold_expires_at = (
            earliest_sale_deadline
        )

    reserved_items = []

    try:
        for item in order_items:
            updated_listing = (
                listings_collection.find_one_and_update(
                    {
                        "_id": ObjectId(
                            item["listing_id"]
                        ),
                        "status": "active",
                        "sale_deadline": {
                            "$gt": now
                        },
                        "$expr": {
                            "$gte": [
                                {
                                    "$subtract": [
                                        "$remaining_quantity",
                                        {
                                            "$ifNull": [
                                                "$reserved_quantity",
                                                0
                                            ]
                                        }
                                    ]
                                },
                                item["quantity"]
                            ]
                        }
                    },
                    {
                        "$inc": {
                            "reserved_quantity":
                                item["quantity"]
                        },
                        "$set": {
                            "updated_at": now
                        }
                    },
                    return_document=ReturnDocument.AFTER
                )
            )

            if not updated_listing:
                rollback_reserved_items(
                    reserved_items
                )

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Not enough available stock for "
                        f"{item['title']}"
                    )
                )

            reserved_items.append(
                item
            )

    except HTTPException:
        raise

    except Exception:
        rollback_reserved_items(
            reserved_items
        )

        raise HTTPException(
            status_code=500,
            detail="Could not reserve stock"
        )

    hold = {
        "customer_id":
            current_user["_id"],

        "business_id":
            business_id,

        "items":
            order_items,

        "status":
            "active",

        "expires_at":
            hold_expires_at,

        "created_at":
            now,

        "updated_at":
            now
    }

    try:
        hold_result = (
            stock_holds_collection.insert_one(
                hold
            )
        )

    except Exception:
        rollback_reserved_items(
            reserved_items
        )

        raise HTTPException(
            status_code=500,
            detail="Could not create stock hold"
        )

    hold_id = str(
        hold_result.inserted_id
    )

    order = {
        "customer_id":
            current_user["_id"],

        "business_id":
            business_id,

        "business_snapshot": {
            "business_name":
                business.get(
                    "business_name"
                ),
            "address":
                business.get(
                    "address"
                ),
            "area":
                business.get(
                    "area"
                )
        },

        "items":
            order_items,

        "stock_hold_id":
            hold_id,

        "food_subtotal":
            round(
                subtotal,
                2
            ),

        "delivery_fee":
            round(
                delivery_fee,
                2
            ),

        "commission_rate_bps":
            commission_rate_bps,

        "commission_amount":
            commission_amount,

        "commission_status":
            "pending",

        "commission_earned":
            False,

        "business_earnings":
            business_earnings,

        "total_amount":
            total_amount,

        "currency":
            "USD",

        "fulfillment_type":
            data.fulfillment_type,

        "payment_status":
            "pending",

        "order_status":
            "pending",

        "created_at":
            now,

        "updated_at":
            now
    }

    if data.fulfillment_type == "delivery":
        order["delivery_snapshot"] = {
            "delivery_area_id":
                data.delivery_area_id,

            "area_code":
                delivery_area.get(
                    "area_code"
                ),

            "area_name":
                delivery_area.get(
                    "area_name"
                ),

            "delivery_address":
                data.delivery_address,

            "delivery_fee":
                delivery_fee,

            "estimated_time_minutes":
                delivery_area.get(
                    "estimated_time_minutes"
                )
        }

    try:
        result = (
            orders_collection.insert_one(
                order
            )
        )

    except Exception:
        release_hold(
            hold_id,
            final_status="released"
        )

        raise HTTPException(
            status_code=500,
            detail="Could not create order"
        )

    order_id = str(
        result.inserted_id
    )

    if data.fulfillment_type == "delivery":
        deliveries_collection.insert_one({
            "order_id":
                order_id,

            "business_id":
                business_id,

            "customer_id":
                current_user["_id"],

            "delivery_area_id":
                data.delivery_area_id,

            "area_code":
                delivery_area.get(
                    "area_code"
                ),

            "area_name":
                delivery_area.get(
                    "area_name"
                ),

            "delivery_address":
                data.delivery_address,

            "delivery_fee":
                delivery_fee,

            "estimated_time_minutes":
                delivery_area.get(
                    "estimated_time_minutes"
                ),

            "status":
                "pending",

            "created_at":
                now,

            "updated_at":
                now
        })

    return {
        "message":
            "Order created and stock held temporarily",

        "order_id":
            order_id,

        "stock_hold_id":
            hold_id,

        "hold_expires_at":
            hold_expires_at,

        "food_subtotal":
            round(
                subtotal,
                2
            ),

        "delivery_fee":
            round(
                delivery_fee,
                2
            ),

        "commission_rate_bps":
            commission_rate_bps,

        "commission_amount":
            commission_amount,

        "business_earnings":
            business_earnings,

        "total_amount":
            total_amount,

        "payment_status":
            "pending",

        "order_status":
            "pending"
    }


@router.get("/my-orders")
def get_my_orders(
    current_user=Depends(
        require_role("customer")
    )
):
    orders = list(
        orders_collection.find({
            "customer_id":
                current_user["_id"]
        }).sort(
            "created_at",
            -1
        )
    )

    for order in orders:
        order["_id"] = str(
            order["_id"]
        )
        if not order.get("checkout_id"):
            payment = payments_collection.find_one({"order_ids": order["_id"]}, {"checkout_id": 1})
            if payment:
                order["checkout_id"] = payment.get("checkout_id")
        business_id = order.get("business_id")
        if business_id and ObjectId.is_valid(str(business_id)):
            business = businesses_collection.find_one({"_id": ObjectId(str(business_id))}, {"business_name": 1})
            order["business_name"] = business.get("business_name", "Business") if business else "Business"

    return orders


@router.get("/business")
def get_business_orders(
    current_user=Depends(
        require_role("business")
    )
):
    business = (
        businesses_collection.find_one({
            "user_id":
                current_user["_id"]
        })
    )

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    orders = list(
        orders_collection.find({
            "business_id":
                str(business["_id"])
        }).sort(
            "created_at",
            -1
        )
    )

    for order in orders:
        order["_id"] = str(
            order["_id"]
        )

    return orders


@router.get("/business/{order_id}")
def get_business_order(
    order_id: str,
    current_user=Depends(
        require_role("business")
    )
):
    if not ObjectId.is_valid(
        order_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid order ID"
        )

    business = (
        businesses_collection.find_one({
            "user_id":
                current_user["_id"]
        })
    )

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    order = orders_collection.find_one({
        "_id": ObjectId(
            order_id
        ),
        "business_id":
            str(business["_id"])
    })

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    order["_id"] = str(
        order["_id"]
    )

    return order


@router.patch("/business/{order_id}/status")
def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    current_user=Depends(
        require_role("business")
    )
):
    if not ObjectId.is_valid(
        order_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid order ID"
        )

    business = (
        businesses_collection.find_one({
            "user_id":
                current_user["_id"]
        })
    )

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    order = orders_collection.find_one({
        "_id": ObjectId(
            order_id
        ),
        "business_id":
            str(business["_id"])
    })

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    current_status = order.get(
        "order_status"
    )

    new_status = data.status

    if current_status in [
        "completed",
        "cancelled"
    ]:
        raise HTTPException(
            status_code=400,
            detail="This order can no longer be changed"
        )

    if (
        new_status != "cancelled"
        and order.get("payment_status")
        != "paid"
    ):
        raise HTTPException(
            status_code=400,
            detail="Order must be paid before fulfillment can continue"
        )

    if new_status == "cancelled":
        if order.get(
            "payment_status"
        ) == "paid":
            raise HTTPException(
                status_code=400,
                detail="Paid orders require a refund before cancellation"
            )

        hold_id = order.get(
            "stock_hold_id"
        )

        if hold_id:
            release_hold(
                hold_id,
                final_status="released"
            )

        now = datetime.now(
            timezone.utc
        )

        orders_collection.update_one(
            {
                "_id":
                    ObjectId(order_id)
            },
            {
                "$set": {
                    "order_status":
                        "cancelled",

                    "updated_at":
                        now
                }
            }
        )

        if (
            order.get(
                "fulfillment_type"
            )
            == "delivery"
        ):
            deliveries_collection.update_one(
                {
                    "order_id":
                        order_id
                },
                {
                    "$set": {
                        "status":
                            "cancelled",

                        "updated_at":
                            now
                    }
                }
            )

        create_notification(
            user_id=
                order["customer_id"],

            notification_type=
                "order_cancelled",

            title=
                "Order Cancelled",

            message=
                "Your order has been cancelled."
        )

        return {
            "message":
                "Order cancelled successfully",

            "status":
                "cancelled"
        }

    if order["fulfillment_type"] == "pickup":
        valid_transitions = {
            "confirmed": [
                "preparing"
            ],
            "preparing": [
                "ready"
            ],
            "ready": [
                "completed"
            ]
        }

    else:
        valid_transitions = {
            "confirmed": [
                "preparing"
            ],
            "preparing": [
                "out_for_delivery"
            ],
            "out_for_delivery": [
                "completed"
            ]
        }

    allowed_statuses = (
        valid_transitions.get(
            current_status,
            []
        )
    )

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot change order from "
                f"{current_status} to {new_status}"
            )
        )

    now = datetime.now(
        timezone.utc
    )

    update_data = {
        "order_status":
            new_status,

        "updated_at":
            now
    }

    if new_status == "completed":
        update_data[
            "completed_at"
        ] = now

        update_data[
            "commission_status"
        ] = "earned"

        update_data[
            "commission_earned"
        ] = True

        update_data[
            "commission_earned_at"
        ] = now

    orders_collection.update_one(
        {
            "_id":
                ObjectId(order_id)
        },
        {
            "$set":
                update_data
        }
    )

    if (
        order["fulfillment_type"]
        == "delivery"
    ):
        delivery_status_map = {
            "confirmed":
                "confirmed",

            "preparing":
                "preparing",

            "out_for_delivery":
                "out_for_delivery",

            "completed":
                "completed"
        }

        if (
            new_status
            in delivery_status_map
        ):
            delivery_update = {
                "status":
                    delivery_status_map[
                        new_status
                    ],

                "updated_at":
                    now
            }

            if (
                new_status
                == "completed"
            ):
                delivery_update[
                    "completed_at"
                ] = now

            deliveries_collection.update_one(
                {
                    "order_id":
                        order_id
                },
                {
                    "$set":
                        delivery_update
                }
            )

    status_messages = {
        "preparing":
            "Your order is being prepared.",

        "ready":
            "Your order is ready for pickup.",

        "out_for_delivery":
            "Your order is out for delivery.",

        "completed":
            "Your order has been completed."
    }

    if new_status in status_messages:
        create_notification(
            user_id=
                order["customer_id"],

            notification_type=
                f"order_{new_status}",

            title=
                "Order Update",

            message=
                status_messages[
                    new_status
                ]
        )

    return {
        "message":
            "Order status updated successfully",

        "status":
            new_status
    }


@router.get("/my-orders/{order_id}")
def get_my_order(
    order_id: str,
    current_user=Depends(
        require_role("customer")
    )
):
    if not ObjectId.is_valid(
        order_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid order ID"
        )

    order = orders_collection.find_one({
        "_id":
            ObjectId(order_id),

        "customer_id":
            current_user["_id"]
    })

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    order["_id"] = str(
        order["_id"]
    )

    return order
