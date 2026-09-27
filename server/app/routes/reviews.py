from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError

from app.database import (
    charities_collection,
    businesses_collection,
    donations_collection,
    listings_collection,
    orders_collection,
    reviews_collection,
    users_collection,
)
from app.schemas.review import ReviewCreate
from app.utils.dependencies import get_current_user, require_role
from app.services.notification_service import create_notification


router = APIRouter(prefix="/reviews", tags=["Reviews"])


def serialize_review(review):
    review["_id"] = str(review["_id"])
    user = users_collection.find_one({"_id": ObjectId(review["reviewer_id"])})
    review["reviewer_name"] = (
        f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
        if user else "BalaHader user"
    )
    return review


def serialize_review_with_target(review):
    item = serialize_review(review)
    target = None
    business_name = ""
    if item.get("target_type") == "listing" and ObjectId.is_valid(item.get("target_id", "")):
        target = listings_collection.find_one({"_id": ObjectId(item["target_id"])})
    elif item.get("target_type") == "donation" and ObjectId.is_valid(item.get("target_id", "")):
        target = donations_collection.find_one({"_id": ObjectId(item["target_id"])})
    if target:
        item["target_title"] = target.get("title", "Untitled item")
        business_id = target.get("business_id")
        if business_id and ObjectId.is_valid(str(business_id)):
            business = businesses_collection.find_one({"_id": ObjectId(str(business_id))})
            business_name = business.get("business_name", "") if business else ""
    else:
        item["target_title"] = "Unavailable item"
    item["business_name"] = business_name
    return item


@router.get("/business")
def get_business_reviews(current_user=Depends(require_role("business"))):
    business = businesses_collection.find_one({"user_id": current_user["_id"]})
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    business_id = str(business["_id"])
    listing_ids = [str(row["_id"]) for row in listings_collection.find({"business_id": business_id}, {"_id": 1})]
    donation_ids = [str(row["_id"]) for row in donations_collection.find({"business_id": business_id}, {"_id": 1})]
    reviews = reviews_collection.find({"$or": [
        {"target_type": "listing", "target_id": {"$in": listing_ids}},
        {"target_type": "donation", "target_id": {"$in": donation_ids}},
    ]}).sort("created_at", -1)
    return [serialize_review_with_target(review) for review in reviews]


@router.get("/admin")
def get_admin_reviews(current_user=Depends(require_role("admin"))):
    reviews = reviews_collection.find().sort("created_at", -1)
    return [serialize_review_with_target(review) for review in reviews]


@router.get("/listings/{listing_id}")
def get_listing_reviews(listing_id: str):
    reviews = list(reviews_collection.find({
        "target_type": "listing", "target_id": listing_id
    }).sort("created_at", -1))
    items = [serialize_review(review) for review in reviews]
    average = round(sum(item["rating"] for item in items) / len(items), 1) if items else 0
    return {"average_rating": average, "review_count": len(items), "reviews": items}


@router.get("/mine/{target_type}/{target_id}")
def get_my_review(
    target_type: str,
    target_id: str,
    current_user=Depends(get_current_user),
):
    if target_type not in {"listing", "donation"}:
        raise HTTPException(status_code=400, detail="Invalid review type")

    review = reviews_collection.find_one({
        "reviewer_id": current_user["_id"],
        "target_type": target_type,
        "target_id": target_id,
    })
    return serialize_review(review) if review else None


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

    review_key = {"reviewer_id": current_user["_id"], "target_type": "listing", "target_id": listing_id}
    if reviews_collection.find_one(review_key):
        raise HTTPException(status_code=409, detail="You have already reviewed this item")

    now = datetime.now(timezone.utc)
    review = {
        **review_key,
        "rating": data.rating,
        "comment": (data.comment or "").strip(),
        "order_id": str(purchased["_id"]),
        "created_at": now,
    }
    try:
        result = reviews_collection.insert_one(review)
        review["_id"] = result.inserted_id
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="You have already reviewed this item")
    listing = listings_collection.find_one({"_id": ObjectId(listing_id)}) if ObjectId.is_valid(listing_id) else None
    business = businesses_collection.find_one({"_id": ObjectId(str(listing.get("business_id")))}) if listing and ObjectId.is_valid(str(listing.get("business_id"))) else None
    if business:
        create_notification(str(business["user_id"]), "new_review", "New customer review", f"{listing.get('title', 'A listing')} received a {data.rating}-star review.")
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

    review_key = {"reviewer_id": current_user["_id"], "target_type": "donation", "target_id": donation_id}
    if reviews_collection.find_one(review_key):
        raise HTTPException(status_code=409, detail="You have already reviewed this donation")

    now = datetime.now(timezone.utc)
    review = {
        **review_key,
        "rating": data.rating,
        "comment": (data.comment or "").strip(),
        "created_at": now,
    }
    try:
        result = reviews_collection.insert_one(review)
        review["_id"] = result.inserted_id
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="You have already reviewed this donation")
    business = businesses_collection.find_one({"_id": ObjectId(str(donation.get("business_id")))}) if ObjectId.is_valid(str(donation.get("business_id"))) else None
    if business:
        create_notification(str(business["user_id"]), "new_review", "New charity review", f"{donation.get('title', 'A donation')} received a {data.rating}-star review.")
    return serialize_review(review)
