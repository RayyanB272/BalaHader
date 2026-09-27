import stripe

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request
)

from bson import ObjectId
from datetime import datetime, timezone

from app.config import settings

from app.database import (
    orders_collection,
    payments_collection,
    payment_events_collection,
    stock_holds_collection,
    listings_collection
)

from app.schemas.payment import PaymentIntentRequest, BatchPaymentIntentRequest
from app.utils.dependencies import require_role
from app.services.stock_hold_service import release_hold
from app.services.notification_service import create_notification


stripe.api_key = settings.STRIPE_SECRET_KEY


router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)


def _commit_order_payment(order, now):
    order_id = str(order["_id"])
    hold_id = order.get("stock_hold_id")
    hold = stock_holds_collection.find_one({"_id": ObjectId(hold_id), "status": "active"}) if hold_id and ObjectId.is_valid(hold_id) else None

    if not hold:
        orders_collection.update_one({"_id": order["_id"]}, {"$set": {"payment_status": "paid_late", "order_status": "reconciliation_required", "reconciliation_reason": "Payment succeeded but stock hold is no longer active", "updated_at": now}})
        return False

    expires_at = hold.get("expires_at")
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at <= now:
        release_hold(hold_id, final_status="expired")
        orders_collection.update_one({"_id": order["_id"]}, {"$set": {"payment_status": "paid_late", "order_status": "reconciliation_required", "reconciliation_reason": "Payment succeeded after stock hold expired", "updated_at": now}})
        return False

    for item in hold["items"]:
        listings_collection.update_one(
            {"_id": ObjectId(item["listing_id"])},
            {"$inc": {"reserved_quantity": -item["quantity"], "remaining_quantity": -item["quantity"], "quantity_sold": item["quantity"]}, "$set": {"updated_at": now}}
        )
    stock_holds_collection.update_one({"_id": ObjectId(hold_id)}, {"$set": {"status": "committed", "committed_at": now, "updated_at": now}})
    orders_collection.update_one({"_id": order["_id"]}, {"$set": {"payment_status": "paid", "order_status": "confirmed", "updated_at": now}})
    create_notification(user_id=order["customer_id"], notification_type="order_confirmed", title="Order Confirmed", message="Your combined payment was successful and this order has been confirmed.")
    return True


def _fail_order_payment(order, now):
    if order.get("payment_status") == "paid":
        return
    hold_id = order.get("stock_hold_id")
    if hold_id:
        release_hold(hold_id, final_status="released")
    orders_collection.update_one({"_id": order["_id"]}, {"$set": {"payment_status": "failed", "order_status": "cancelled", "updated_at": now}})


@router.post("/create-intent")
def create_payment_intent(
    data: PaymentIntentRequest,
    current_user=Depends(require_role("customer"))
):
    if not ObjectId.is_valid(data.order_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid order ID"
        )

    order = orders_collection.find_one({
        "_id": ObjectId(data.order_id),
        "customer_id": current_user["_id"]
    })

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    if order["payment_status"] == "paid":
        raise HTTPException(
            status_code=400,
            detail="Order is already paid"
        )

    if order["order_status"] == "cancelled":
        raise HTTPException(
            status_code=400,
            detail="Cancelled orders cannot be paid"
        )

    amount_in_cents = int(
        round(
            order["total_amount"] * 100
        )
    )

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_in_cents,
            currency=order["currency"].lower(),
            payment_method_types=["card"],
            metadata={
                "order_id": str(order["_id"]),
                "customer_id": current_user["_id"]
            }
        )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Could not create payment intent"
        )

    now = datetime.now(timezone.utc)

    payments_collection.insert_one({
        "order_id": str(order["_id"]),
        "customer_id": current_user["_id"],
        "stripe_payment_intent_id": intent.id,
        "amount": order["total_amount"],
        "currency": order["currency"],
        "status": intent.status,
        "created_at": now,
        "updated_at": now
    })

    return {
        "payment_intent_id": intent.id,
        "client_secret": intent.client_secret,
        "amount": order["total_amount"],
        "currency": order["currency"]
    }


@router.post("/webhook")
async def stripe_webhook(
    request: Request
):
    payload = await request.body()

    signature = request.headers.get(
        "stripe-signature"
    )

    try:
        event = stripe.Webhook.construct_event(
            payload,
            signature,
            settings.STRIPE_WEBHOOK_SECRET
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid webhook"
        )

    event_id = event["id"]
    event_type = event["type"]

    existing_event = (
        payment_events_collection.find_one({
            "stripe_event_id": event_id,
            "status": "processed"
        })
    )

    if existing_event:
        return {
            "status": "already_processed"
        }

    payment_events_collection.update_one(
        {
            "stripe_event_id": event_id
        },
        {
            "$set": {
                "stripe_event_id": event_id,
                "event_type": event_type,
                "status": "processing",
                "updated_at": datetime.now(timezone.utc)
            },
            "$setOnInsert": {
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

    try:
        if event_type == "payment_intent.succeeded":
            intent = (
                event["data"]["object"]
                .to_dict()
            )

            checkout_id = intent["metadata"].get("checkout_id")
            if checkout_id:
                payment = payments_collection.find_one({"checkout_id": checkout_id, "stripe_payment_intent_id": intent["id"]})
                if payment:
                    now = datetime.now(timezone.utc)
                    orders = list(orders_collection.find({"_id": {"$in": [ObjectId(value) for value in payment.get("order_ids", [])]}}))
                    commit_results = [_commit_order_payment(order, now) for order in orders]
                    all_committed = bool(commit_results) and all(commit_results)
                    payments_collection.update_one({"_id": payment["_id"]}, {"$set": {"status": "succeeded" if all_committed else "succeeded_late", "updated_at": now}})
                    payment_events_collection.update_one({"stripe_event_id": event_id}, {"$set": {"status": "processed", "processed_at": now, "updated_at": now}})
                    return {"status": "success" if all_committed else "reconciliation_required"}

            order_id = intent[
                "metadata"
            ].get(
                "order_id"
            )

            if (
                order_id
                and ObjectId.is_valid(
                    order_id
                )
            ):
                order = (
                    orders_collection.find_one({
                        "_id": ObjectId(
                            order_id
                        )
                    })
                )

                if (
                    order
                    and order.get(
                        "payment_status"
                    )
                    != "paid"
                ):
                    hold_id = order.get(
                        "stock_hold_id"
                    )

                    now = datetime.now(
                        timezone.utc
                    )

                    hold = None

                    if (
                        hold_id
                        and ObjectId.is_valid(
                            hold_id
                        )
                    ):
                        hold = (
                            stock_holds_collection.find_one({
                                "_id": ObjectId(
                                    hold_id
                                ),
                                "status": "active"
                            })
                        )

                    if hold:
                        hold_expires_at = (
                            hold.get(
                                "expires_at"
                            )
                        )

                        if (
                            hold_expires_at
                            and hold_expires_at.tzinfo
                            is None
                        ):
                            hold_expires_at = (
                                hold_expires_at.replace(
                                    tzinfo=timezone.utc
                                )
                            )

                        if (
                            hold_expires_at
                            and hold_expires_at
                            <= now
                        ):
                            release_hold(
                                hold_id,
                                final_status="expired"
                            )

                            orders_collection.update_one(
                                {
                                    "_id":
                                        ObjectId(
                                            order_id
                                        )
                                },
                                {
                                    "$set": {
                                        "payment_status":
                                            "paid_late",

                                        "order_status":
                                            "reconciliation_required",

                                        "reconciliation_reason":
                                            "Payment succeeded after stock hold expired",

                                        "updated_at":
                                            now
                                    }
                                }
                            )

                            payments_collection.update_one(
                                {
                                    "stripe_payment_intent_id":
                                        intent["id"]
                                },
                                {
                                    "$set": {
                                        "status":
                                            "succeeded_late",

                                        "updated_at":
                                            now
                                    }
                                }
                            )

                            create_notification(
                                user_id=
                                    order[
                                        "customer_id"
                                    ],

                                notification_type=
                                    "payment_reconciliation",

                                title=
                                    "Payment Requires Review",

                                message=(
                                    "Your payment was received after the stock "
                                    "reservation expired. The order requires review."
                                )
                            )

                            payment_events_collection.update_one(
                                {
                                    "stripe_event_id":
                                        event_id
                                },
                                {
                                    "$set": {
                                        "status":
                                            "processed",

                                        "processed_at":
                                            now,

                                        "updated_at":
                                            now
                                    }
                                }
                            )

                            return {
                                "status":
                                    "reconciliation_required"
                            }

                        for item in hold[
                            "items"
                        ]:
                            listings_collection.update_one(
                                {
                                    "_id":
                                        ObjectId(
                                            item[
                                                "listing_id"
                                            ]
                                        )
                                },
                                {
                                    "$inc": {
                                        "reserved_quantity":
                                            -item[
                                                "quantity"
                                            ],

                                        "remaining_quantity":
                                            -item[
                                                "quantity"
                                            ],

                                        "quantity_sold":
                                            item[
                                                "quantity"
                                            ]
                                    },

                                    "$set": {
                                        "updated_at":
                                            now
                                    }
                                }
                            )

                        stock_holds_collection.update_one(
                            {
                                "_id":
                                    ObjectId(
                                        hold_id
                                    )
                            },
                            {
                                "$set": {
                                    "status":
                                        "committed",

                                    "committed_at":
                                        now,

                                    "updated_at":
                                        now
                                }
                            }
                        )

                        orders_collection.update_one(
                            {
                                "_id":
                                    ObjectId(
                                        order_id
                                    )
                            },
                            {
                                "$set": {
                                    "payment_status":
                                        "paid",

                                    "order_status":
                                        "confirmed",

                                    "updated_at":
                                        now
                                }
                            }
                        )

                        create_notification(
                            user_id=
                                order[
                                    "customer_id"
                                ],

                            notification_type=
                                "order_confirmed",

                            title=
                                "Order Confirmed",

                            message=(
                                "Your payment was successful and "
                                "your order has been confirmed."
                            )
                        )

                        payments_collection.update_one(
                            {
                                "stripe_payment_intent_id":
                                    intent[
                                        "id"
                                    ]
                            },
                            {
                                "$set": {
                                    "status":
                                        "succeeded",

                                    "updated_at":
                                        now
                                }
                            }
                        )

                    else:
                        orders_collection.update_one(
                            {
                                "_id":
                                    ObjectId(
                                        order_id
                                    )
                            },
                            {
                                "$set": {
                                    "payment_status":
                                        "paid_late",

                                    "order_status":
                                        "reconciliation_required",

                                    "reconciliation_reason":
                                        "Payment succeeded but stock hold is no longer active",

                                    "updated_at":
                                        now
                                }
                            }
                        )

                        payments_collection.update_one(
                            {
                                "stripe_payment_intent_id":
                                    intent[
                                        "id"
                                    ]
                            },
                            {
                                "$set": {
                                    "status":
                                        "succeeded_late",

                                    "updated_at":
                                        now
                                }
                            }
                        )

                        create_notification(
                            user_id=
                                order[
                                    "customer_id"
                                ],

                            notification_type=
                                "payment_reconciliation",

                            title=
                                "Payment Requires Review",

                            message=(
                                "Your payment was received after the stock "
                                "reservation ended. The order requires review."
                            )
                        )

        elif event_type == "payment_intent.payment_failed":
            intent = (
                event["data"]["object"]
                .to_dict()
            )

            checkout_id = intent["metadata"].get("checkout_id")
            if checkout_id:
                payment = payments_collection.find_one({"checkout_id": checkout_id, "stripe_payment_intent_id": intent["id"]})
                if payment:
                    now = datetime.now(timezone.utc)
                    orders = list(orders_collection.find({"_id": {"$in": [ObjectId(value) for value in payment.get("order_ids", [])]}}))
                    for order in orders:
                        _fail_order_payment(order, now)
                    payments_collection.update_one({"_id": payment["_id"]}, {"$set": {"status": "failed", "updated_at": now}})
                    create_notification(user_id=payment["customer_id"], notification_type="payment_failed", title="Payment Failed", message="Your combined payment failed and all reserved stock has been released.")
                    payment_events_collection.update_one({"stripe_event_id": event_id}, {"$set": {"status": "processed", "processed_at": now, "updated_at": now}})
                    return {"status": "success"}

            order_id = intent[
                "metadata"
            ].get(
                "order_id"
            )

            if (
                order_id
                and ObjectId.is_valid(
                    order_id
                )
            ):
                order = (
                    orders_collection.find_one({
                        "_id":
                            ObjectId(
                                order_id
                            )
                    })
                )

                if (
                    order
                    and order.get(
                        "payment_status"
                    )
                    != "paid"
                ):
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
                                ObjectId(
                                    order_id
                                )
                        },
                        {
                            "$set": {
                                "payment_status":
                                    "failed",

                                "order_status":
                                    "cancelled",

                                "updated_at":
                                    now
                            }
                        }
                    )

                    payments_collection.update_one(
                        {
                            "stripe_payment_intent_id":
                                intent[
                                    "id"
                                ]
                        },
                        {
                            "$set": {
                                "status":
                                    "failed",

                                "updated_at":
                                    now
                            }
                        }
                    )

                    create_notification(
                        user_id=
                            order[
                                "customer_id"
                            ],

                        notification_type=
                            "payment_failed",

                        title=
                            "Payment Failed",

                        message=(
                            "Your payment failed and the reserved "
                            "stock has been released."
                        )
                    )

        payment_events_collection.update_one(
            {
                "stripe_event_id":
                    event_id
            },
            {
                "$set": {
                    "status":
                        "processed",

                    "processed_at":
                        datetime.now(
                            timezone.utc
                        ),

                    "updated_at":
                        datetime.now(
                            timezone.utc
                        )
                }
            }
        )

    except Exception as error:
        payment_events_collection.update_one(
            {
                "stripe_event_id":
                    event_id
            },
            {
                "$set": {
                    "status":
                        "failed",

                    "error":
                        str(error),

                    "updated_at":
                        datetime.now(
                            timezone.utc
                        )
                }
            }
        )

        raise

    return {
        "status": "success"
    }


@router.post("/create-batch-intent")
def create_batch_payment_intent(data: BatchPaymentIntentRequest, current_user=Depends(require_role("customer"))):
    order_ids = list(dict.fromkeys(data.order_ids))
    if not order_ids or any(not ObjectId.is_valid(order_id) for order_id in order_ids):
        raise HTTPException(status_code=400, detail="Invalid order IDs")

    orders = list(orders_collection.find({"_id": {"$in": [ObjectId(order_id) for order_id in order_ids]}, "customer_id": current_user["_id"]}))
    if len(orders) != len(order_ids):
        raise HTTPException(status_code=404, detail="One or more orders were not found")
    if any(order.get("payment_status") == "paid" or order.get("order_status") == "cancelled" for order in orders):
        raise HTTPException(status_code=400, detail="One or more orders cannot be paid")

    currencies = {order.get("currency", "USD").upper() for order in orders}
    if len(currencies) != 1:
        raise HTTPException(status_code=400, detail="All orders must use the same currency")

    checkout_id = str(ObjectId())
    total = round(sum(float(order["total_amount"]) for order in orders), 2)
    currency = currencies.pop()
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(round(total * 100)),
            currency=currency.lower(),
            payment_method_types=["card"],
            metadata={"checkout_id": checkout_id, "customer_id": current_user["_id"]}
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail="Could not create combined payment intent") from error

    now = datetime.now(timezone.utc)
    payments_collection.insert_one({
        "checkout_id": checkout_id,
        "order_ids": order_ids,
        "customer_id": current_user["_id"],
        "stripe_payment_intent_id": intent.id,
        "amount": total,
        "currency": currency,
        "status": intent.status,
        "created_at": now,
        "updated_at": now,
    })
    orders_collection.update_many(
        {"_id": {"$in": [order["_id"] for order in orders]}},
        {"$set": {"checkout_id": checkout_id, "updated_at": now}},
    )
    return {"checkout_id": checkout_id, "client_secret": intent.client_secret, "amount": total, "currency": currency, "order_count": len(order_ids)}


@router.get("/checkout/{checkout_id}")
def get_checkout_payment(checkout_id: str, current_user=Depends(require_role("customer"))):
    payment = payments_collection.find_one({"checkout_id": checkout_id, "customer_id": current_user["_id"]})
    if not payment:
        raise HTTPException(status_code=404, detail="Checkout not found")
    orders = list(orders_collection.find({"_id": {"$in": [ObjectId(value) for value in payment.get("order_ids", [])]}}))
    statuses = [order.get("payment_status") for order in orders]
    return {
        "checkout_id": checkout_id,
        "order_ids": payment.get("order_ids", []),
        "payment_status": "paid" if statuses and all(status == "paid" for status in statuses) else ("failed" if any(status == "failed" for status in statuses) else payment.get("status", "pending")),
        "order_count": len(orders),
    }
