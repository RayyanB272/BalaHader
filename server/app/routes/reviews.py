from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo import ReturnDocument

from app.database import (
    charities_collection,
    donations_collection,
    orders_collection,
    reviews_collection,
    users_collection,
)
from app.schemas.review import ReviewCreate
from app.utils.dependencies import require_role


router = APIRouter(prefix="/reviews", tags=["Reviews"])


def serialize_review(review):
    review["_id"] = str(review["_id"])
    user = users_collection.find_one({"_id": ObjectId(review["reviewer_id"])})
    review["reviewer_name"] = (
        f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
        if user else "BalaHader user"
    )
    return review


@router.get("/listings/{listing_id}")
def get_listing_reviews(listing_id: str):
    reviews = list(reviews_collection.find({
        "target_type": "listing", "target_id": listing_id
    }).sort("created_at", -1))
    items = [serialize_review(review) for review in reviews]
    average = round(sum(item["rating"] for item in items) / len(items), 1) if items else 0
    return {"average_rating": average, "review_count": len(items), "reviews": items}


@router.post("/listings/{listing_id}")
def review_listing(
    listing_id: str,
    data: ReviewCreate,
    current_user=Depends(require_role("customer")),
):
    purchased = orders_collection.find_one({
        "customer_id": current_user["_id"],
        "order_status": "completed",
        "items": {"$elemMatch": {"listing_id": listing_id}},
    })
    if not purchased:
        raise HTTPException(status_code=403, detail="Complete an order containing this item before reviewing it")

    now = datetime.now(timezone.utc)
    review = reviews_collection.find_one_and_update(
        {"reviewer_id": current_user["_id"], "target_type": "listing", "target_id": listing_id},
        {"$set": {"rating": data.rating, "comment": (data.comment or "").strip(), "updated_at": now},
         "$setOnInsert": {"created_at": now, "order_id": str(purchased["_id"])}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return serialize_review(review)


@router.post("/donations/{donation_id}")
def review_donation(
    donation_id: str,
    data: ReviewCreate,
    current_user=Depends(require_role("charity")),
):
    if not ObjectId.is_valid(donation_id):
        raise HTTPException(status_code=400, detail="Invalid donation ID")
    charity = charities_collection.find_one({"user_id": current_user["_id"]})
    donation = donations_collection.find_one({
        "_id": ObjectId(donation_id),
        "charity_id": str(charity["_id"]) if charity else None,
        "status": "completed",
    })
    if not donation:
        raise HTTPException(status_code=403, detail="Complete this donation pickup before reviewing it")

    now = datetime.now(timezone.utc)
    review = reviews_collection.find_one_and_update(
        {"reviewer_id": current_user["_id"], "target_type": "donation", "target_id": donation_id},
        {"$set": {"rating": data.rating, "comment": (data.comment or "").strip(), "updated_at": now},
         "$setOnInsert": {"created_at": now}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return serialize_review(review)
