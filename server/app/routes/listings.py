from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional

from app.database import (
    businesses_collection,
    listings_collection,
    reviews_collection
)

from app.schemas.listing import (
    ListingCreate,
    ListingUpdate,
    ListingDisable
)
from app.utils.dependencies import require_role


router = APIRouter(
    prefix="/listings",
    tags=["Surplus Listings"]
)

@router.post("/")
def create_listing(
    data: ListingCreate,
    current_user=Depends(require_role("business"))
):
    business = businesses_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Create your business profile first"
        )

    if data.discounted_price >= data.original_price:
        raise HTTPException(
            status_code=400,
            detail="Discounted price must be lower than original price"
        )

    if data.pickup_deadline <= data.sale_deadline:
        raise HTTPException(
            status_code=400,
            detail="Pickup deadline must be after sale deadline"
        )

    if (
        data.fulfillment_type in ["delivery", "both"]
        and not business.get("delivery_enabled")
    ):
        raise HTTPException(
            status_code=400,
            detail="Add at least one delivery area before enabling delivery"
        )

    listing = {
        "business_id": str(business["_id"]),

        "title": data.title,
        "description": data.description,
        "category": data.category,

        "original_price": data.original_price,
        "discounted_price": data.discounted_price,

        "original_quantity": data.quantity,
        "remaining_quantity": data.quantity,
        "reserved_quantity": 0,
        "quantity_sold": 0,

        "sale_deadline": data.sale_deadline,
        "pickup_deadline": data.pickup_deadline,

        "fulfillment_type": data.fulfillment_type,
        "donate_if_unsold": data.donate_if_unsold,
        "donation_eligible": data.donation_eligible,

        "image_url": data.image_url,
        "servings_per_package": data.servings_per_package,
        "package_contents": data.package_contents,
        "dietary_tags": data.dietary_tags,
        "allergens": data.allergens,
        "suitable_meals": data.suitable_meals,

        "status": "active",

        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    result = listings_collection.insert_one(listing)

    return {
        "message": "Surplus listing created successfully",
        "listing_id": str(result.inserted_id)
    }

@router.get("/my-listings")
def get_my_listings(
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

    for listing in listings:
        listing["_id"] = str(listing["_id"])

    return listings

@router.patch("/{listing_id}")
def update_listing(
    listing_id: str,
    data: ListingUpdate,
    current_user=Depends(require_role("business"))
):
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid listing ID"
        )

    business = businesses_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    listing = listings_collection.find_one({
        "_id": ObjectId(listing_id),
        "business_id": str(business["_id"])
    })

    if not listing:
        raise HTTPException(
            status_code=404,
            detail="Listing not found"
        )

    if listing.get("status") == "disabled":
        raise HTTPException(
            status_code=400,
            detail="A disabled listing cannot be edited"
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No listing changes were provided"
        )

    for field in ["title", "description", "image_url"]:
        if (
            field in update_data
            and isinstance(update_data[field], str)
        ):
            update_data[field] = update_data[field].strip()

    if "title" in update_data and not update_data["title"]:
        raise HTTPException(
            status_code=400,
            detail="Title cannot be empty"
        )

    original_price = update_data.get(
        "original_price",
        listing["original_price"]
    )

    discounted_price = update_data.get(
        "discounted_price",
        listing["discounted_price"]
    )

    if discounted_price >= original_price:
        raise HTTPException(
            status_code=400,
            detail="Discounted price must be lower than original price"
        )

    sale_deadline = update_data.get(
        "sale_deadline",
        listing["sale_deadline"]
    )

    pickup_deadline = update_data.get(
        "pickup_deadline",
        listing["pickup_deadline"]
    )

    if pickup_deadline <= sale_deadline:
        raise HTTPException(
            status_code=400,
            detail="Pickup deadline must be after sale deadline"
        )

    fulfillment_type = update_data.get(
        "fulfillment_type",
        listing["fulfillment_type"]
    )

    if (
        fulfillment_type in ["delivery", "both"]
        and not business.get("delivery_enabled")
    ):
        raise HTTPException(
            status_code=400,
            detail="Add at least one delivery area before enabling delivery"
        )

    if "quantity" in update_data:
        new_quantity = update_data.pop("quantity")

        original_quantity = listing.get(
            "original_quantity",
            listing.get("remaining_quantity", 0)
        )

        remaining_quantity = listing.get(
            "remaining_quantity",
            0
        )

        reserved_quantity = listing.get(
            "reserved_quantity",
            0
        )

        already_allocated = (
            original_quantity
            - remaining_quantity
            + reserved_quantity
        )

        if new_quantity < already_allocated:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Quantity cannot be lower than food already "
                    "sold, donated, or reserved"
                )
            )

        quantity_difference = (
            new_quantity - original_quantity
        )

        update_data["original_quantity"] = new_quantity
        update_data["remaining_quantity"] = (
            remaining_quantity + quantity_difference
        )

    update_data["updated_at"] = datetime.now(
        timezone.utc
    )

    listings_collection.update_one(
        {
            "_id": listing["_id"]
        },
        {
            "$set": update_data
        }
    )

    updated_listing = listings_collection.find_one({
        "_id": listing["_id"]
    })

    updated_listing["_id"] = str(
        updated_listing["_id"]
    )

    return updated_listing


@router.patch("/{listing_id}/disable")
def disable_own_listing(
    listing_id: str,
    data: ListingDisable,
    current_user=Depends(require_role("business"))
):
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid listing ID"
        )

    business = businesses_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    listing = listings_collection.find_one({
        "_id": ObjectId(listing_id),
        "business_id": str(business["_id"])
    })

    if not listing:
        raise HTTPException(
            status_code=404,
            detail="Listing not found"
        )

    if listing.get("status") == "disabled":
        raise HTTPException(
            status_code=400,
            detail="Listing is already disabled"
        )

    if listing.get("reserved_quantity", 0) > 0:
        raise HTTPException(
            status_code=400,
            detail="A listing with reserved stock cannot be disabled"
        )

    reason = data.reason.strip()

    if len(reason) < 3:
        raise HTTPException(
            status_code=400,
            detail="Disable reason must contain at least 3 characters"
        )

    now = datetime.now(timezone.utc)

    listings_collection.update_one(
        {
            "_id": listing["_id"]
        },
        {
            "$set": {
                "status": "disabled",
                "disabled_reason": reason,
                "disabled_at": now,
                "updated_at": now
            }
        }
    )

    return {
        "message": "Listing disabled successfully",
        "status": "disabled",
        "reason": reason
    }

@router.get("/")
def get_public_listings(
    search: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    area: Optional[str] = Query(default=None),
    max_price: Optional[float] = Query(default=None, gt=0),
    fulfillment_type: Optional[str] = Query(default=None)
):
    now = datetime.now(timezone.utc)

    query = {
        "status": "active",
        "sale_deadline": {"$gt": now},
        "remaining_quantity": {"$gt": 0}
    }

    if category:
        query["category"] = category

    if max_price is not None:
        query["discounted_price"] = {
            "$lte": max_price
        }

    if fulfillment_type:
        if fulfillment_type == "pickup":
            query["fulfillment_type"] = {
                "$in": ["pickup", "both"]
            }

        elif fulfillment_type == "delivery":
            query["fulfillment_type"] = {
                "$in": ["delivery", "both"]
            }

        else:
            raise HTTPException(
                status_code=400,
                detail="Fulfillment type must be pickup or delivery"
            )

    listings = list(
        listings_collection.find(query).sort(
            "created_at",
            -1
        )
    )

    results = []

    for listing in listings:
        available_quantity = (
            listing.get("remaining_quantity", 0)
            - listing.get("reserved_quantity", 0)
        )

        if available_quantity <= 0:
            continue

        business = None

        if ObjectId.is_valid(
            listing["business_id"]
        ):
            business = businesses_collection.find_one({
                "_id": ObjectId(
                    listing["business_id"]
                )
            })

        if not business:
            continue

        if area:
            business_area = (
                business.get("area") or ""
            ).lower()

            if area.lower() not in business_area:
                continue

        if search:
            search_text = search.lower()

            title = (
                listing.get("title") or ""
            ).lower()

            description = (
                listing.get("description") or ""
            ).lower()

            business_name = (
                business.get("business_name") or ""
            ).lower()

            if (
                search_text not in title
                and search_text not in description
                and search_text not in business_name
            ):
                continue

        rating_rows = list(reviews_collection.find(
            {"target_type": "listing", "target_id": str(listing["_id"])},
            {"rating": 1}
        ))
        average_rating = round(
            sum(row["rating"] for row in rating_rows) / len(rating_rows), 1
        ) if rating_rows else 0

        results.append({
            "_id": str(listing["_id"]),
            "title": listing.get("title"),
            "description": listing.get(
                "description"
            ),
            "category": listing.get(
                "category"
            ),
            "original_price": listing.get(
                "original_price"
            ),
            "discounted_price": listing.get(
                "discounted_price"
            ),
            "available_quantity":
                available_quantity,
            "sale_deadline": listing.get(
                "sale_deadline"
            ),
            "pickup_deadline": listing.get(
                "pickup_deadline"
            ),
            "fulfillment_type": listing.get(
                "fulfillment_type"
            ),
            "image_url": listing.get(
                "image_url"
            ),
            "servings_per_package": listing.get("servings_per_package", 1),
            "package_contents": listing.get("package_contents"),
            "dietary_tags": listing.get("dietary_tags", []),
            "allergens": listing.get("allergens", []),
            "suitable_meals": listing.get("suitable_meals", []),
            "average_rating": average_rating,
            "review_count": len(rating_rows),
            "business": {
                "business_id":
                    str(business["_id"]),
                "business_name":
                    business.get(
                        "business_name"
                    ),
                "area":
                    business.get("area"),
                "address":
                    business.get("address")
            }
        })

    return results

@router.get("/{listing_id}")
def get_listing(listing_id: str):

    if not ObjectId.is_valid(listing_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid listing ID"
        )

    listing = listings_collection.find_one({
        "_id": ObjectId(listing_id)
    })

    if not listing:
        raise HTTPException(
            status_code=404,
            detail="Listing not found"
        )

    business = businesses_collection.find_one({
        "_id": ObjectId(listing["business_id"])
    })

    listing["_id"] = str(listing["_id"])

    if business:
        listing["business"] = {
            "id": str(business["_id"]),
            "name": business["business_name"],
            "phone": business["phone"],
            "address": business["address"],
            "area": business["area"],
            "delivery_enabled": business.get(
                "delivery_enabled",
                False
            )
        }

    return listing
