from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId

from app.database import (
    businesses_collection,
    delivery_areas_collection,
    listings_collection,
    orders_collection,
    donations_collection
)

from app.schemas.business import (
    BusinessCreate,
    BusinessUpdate
)

from app.schemas.delivery_area import DeliveryAreaCreate

from app.utils.dependencies import require_role


router = APIRouter(
    prefix="/businesses",
    tags=["Businesses"]
)

@router.post("/profile")
def create_business_profile(
    data: BusinessCreate,
    current_user=Depends(require_role("business"))
):

    existing = businesses_collection.find_one({
        "user_id": current_user["_id"]
    })

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Business profile already exists"
        )

    business = {
        "user_id": current_user["_id"],
        "business_name": data.business_name,
        "business_type": data.business_type,
        "description": data.description,
        "phone": data.phone,
        "address": data.address,
        "area": data.area,
        "pickup_info": data.pickup_info,
        "delivery_enabled": data.delivery_enabled,
        "status": "active",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    result = businesses_collection.insert_one(business)

    return {
        "message": "Business profile created successfully",
        "business_id": str(result.inserted_id)
    }

@router.get("/me")
def get_my_business_profile(
    current_user=Depends(require_role("business"))
):

    business = businesses_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    business["_id"] = str(business["_id"])

    return business

@router.patch("/profile")
def update_business_profile(
    data: BusinessUpdate,
    current_user=Depends(require_role("business"))
):
    business = businesses_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    update_data = data.model_dump(exclude_none=True)

    text_fields = [
        "business_name",
        "business_type",
        "description",
        "phone",
        "address",
        "area"
    ]

    for field in text_fields:
        if field in update_data:
            update_data[field] = update_data[field].strip()

    required_fields = [
        "business_name",
        "business_type",
        "phone",
        "address",
        "area"
    ]

    for field in required_fields:
        if field in update_data and not update_data[field]:
            raise HTTPException(
                status_code=400,
                detail=f"{field.replace('_', ' ').title()} cannot be empty"
            )

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No profile changes were provided"
        )

    update_data["updated_at"] = datetime.now(timezone.utc)

    businesses_collection.update_one(
        {
            "_id": business["_id"]
        },
        {
            "$set": update_data
        }
    )

    updated_business = businesses_collection.find_one({
        "_id": business["_id"]
    })

    updated_business["_id"] = str(
        updated_business["_id"]
    )

    return updated_business

@router.post("/delivery-areas")
def add_delivery_area(
    data: DeliveryAreaCreate,
    current_user=Depends(require_role("business"))
):
    business = businesses_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    existing_area = delivery_areas_collection.find_one({
        "business_id": str(business["_id"]),
        "area_code": data.area_code.upper()
    })

    if existing_area:
        raise HTTPException(
            status_code=400,
            detail="This delivery area already exists"
        )

    delivery_area = {
        "business_id": str(business["_id"]),

        "country_code": "LB",
        "city_code": "TRIPOLI",

        "area_code": data.area_code.upper(),
        "area_name": data.area_name,

        "delivery_fee": data.delivery_fee,
        "estimated_time_minutes": data.estimated_time_minutes,

        "is_active": True,

        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    result = delivery_areas_collection.insert_one(
        delivery_area
    )

    businesses_collection.update_one(
        {
            "_id": business["_id"]
        },
        {
            "$set": {
                "delivery_enabled": True,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    return {
        "message": "Delivery area added successfully",
        "delivery_area_id": str(result.inserted_id)
    }

@router.get("/delivery-areas")
def get_delivery_areas(
    current_user=Depends(require_role("business"))
):
    business = businesses_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    areas = list(
        delivery_areas_collection.find({
            "business_id": str(business["_id"])
        })
    )

    for area in areas:
        area["_id"] = str(area["_id"])

    return areas


@router.get("/{business_id}/delivery-areas")
def get_public_delivery_areas(business_id: str):
    if not ObjectId.is_valid(business_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid business ID"
        )

    business = businesses_collection.find_one({
        "_id": ObjectId(business_id),
        "status": "active",
        "delivery_enabled": True
    })

    if not business:
        return []

    areas = list(
        delivery_areas_collection.find({
            "business_id": business_id,
            "is_active": True
        }).sort("area_name", 1)
    )

    return [
        {
            "_id": str(area["_id"]),
            "area_code": area.get("area_code"),
            "area_name": area.get("area_name"),
            "delivery_fee": float(area.get("delivery_fee", 0)),
            "estimated_time_minutes": area.get("estimated_time_minutes")
        }
        for area in areas
    ]

@router.get("/insights/unsold-items")
def get_unsold_items_insights(
    current_user=Depends(require_role("business"))
):
    business = businesses_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    listings = list(
        listings_collection.find({
            "business_id": str(business["_id"])
        })
    )

    insights = []

    for listing in listings:
        original_quantity = listing.get(
            "original_quantity",
            listing.get("quantity", 0)
        )

        quantity_sold = listing.get(
            "quantity_sold",
            0
        )

        remaining_quantity = listing.get(
            "remaining_quantity",
            0
        )

        reserved_quantity = listing.get(
            "reserved_quantity",
            0
        )

        unsold_quantity = max(
            remaining_quantity - reserved_quantity,
            0
        )

        if original_quantity > 0:
            unsold_rate = round(
                (unsold_quantity / original_quantity) * 100,
                2
            )
        else:
            unsold_rate = 0

        insights.append({
            "listing_id": str(listing["_id"]),
            "title": listing["title"],
            "category": listing.get("category"),
            "original_quantity": original_quantity,
            "quantity_sold": quantity_sold,
            "unsold_quantity": unsold_quantity,
            "unsold_rate": unsold_rate
        })

    insights.sort(
        key=lambda item: item["unsold_rate"],
        reverse=True
    )

    return insights

@router.get("/insights/unsold-summary")
def get_unsold_summary(
    current_user=Depends(require_role("business"))
):
    business = businesses_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    listings = list(
        listings_collection.find({
            "business_id": str(business["_id"])
        })
    )

    grouped = {}

    for listing in listings:
        title = listing["title"].strip()

        original_quantity = listing.get(
            "original_quantity",
            listing.get("quantity", 0)
        )

        quantity_sold = listing.get(
            "quantity_sold",
            0
        )

        remaining_quantity = listing.get(
            "remaining_quantity",
            0
        )

        reserved_quantity = listing.get(
            "reserved_quantity",
            0
        )

        unsold_quantity = max(
            remaining_quantity - reserved_quantity,
            0
        )

        if title not in grouped:
            grouped[title] = {
                "title": title,
                "category": listing.get("category"),
                "times_listed": 0,
                "total_offered": 0,
                "total_sold": 0,
                "total_unsold": 0
            }

        grouped[title]["times_listed"] += 1
        grouped[title]["total_offered"] += original_quantity
        grouped[title]["total_sold"] += quantity_sold
        grouped[title]["total_unsold"] += unsold_quantity

    insights = []

    for item in grouped.values():
        if item["total_offered"] > 0:
            unsold_rate = round(
                (
                    item["total_unsold"]
                    / item["total_offered"]
                ) * 100,
                2
            )
        else:
            unsold_rate = 0

        item["unsold_rate"] = unsold_rate
        insights.append(item)

    insights.sort(
        key=lambda item: item["unsold_rate"],
        reverse=True
    )

    return insights

@router.get("/dashboard/summary")
def get_business_dashboard_summary(
    current_user=Depends(require_role("business"))
):
    business = businesses_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    business_id = str(business["_id"])

    listings = list(
        listings_collection.find({
            "business_id": business_id
        })
    )

    orders = list(
        orders_collection.find({
            "business_id": business_id
        })
    )

    donations = list(
        donations_collection.find({
            "business_id": business_id
        })
    )

    total_listings = len(listings)

    active_listings = sum(
        1
        for listing in listings
        if listing.get("status") == "active"
    )

    total_food_sales = 0
    total_delivery_fees = 0
    total_commission = 0
    total_earnings = 0
    completed_orders = 0

    for order in orders:
        if order.get("payment_status") == "paid":
            total_food_sales += order.get(
                "food_subtotal",
                0
            )

            total_delivery_fees += order.get(
                "delivery_fee",
                0
            )

        if (
            order.get("order_status") == "completed"
            and order.get("payment_status") == "paid"
        ):
            completed_orders += 1

            total_commission += order.get(
                "commission_amount",
                0
            )

            total_earnings += order.get(
                "business_earnings",
                0
            )

    total_donations = len(donations)

    completed_donations = sum(
        1
        for donation in donations
        if donation.get("status") == "completed"
    )

    return {
        "total_listings": total_listings,
        "active_listings": active_listings,
        "total_orders": len(orders),
        "completed_orders": completed_orders,
        "food_sales": round(total_food_sales, 2),
        "delivery_fees": round(total_delivery_fees, 2),
        "commission": round(total_commission, 2),
        "earnings": round(total_earnings, 2),
        "total_donations": total_donations,
        "completed_donations": completed_donations
    }
