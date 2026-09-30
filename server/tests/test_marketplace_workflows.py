from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import HTTPException
import pytest

from app.routes import donations, listings, reviews
from app.schemas.listing import ListingCreate
from app.schemas.review import ReviewCreate


def test_business_can_create_listing(monkeypatch, mongo_db):
    user_id, business_id = "business-user", ObjectId()
    mongo_db.businesses.insert_one({"_id": business_id, "user_id": user_id, "delivery_enabled": False})
    monkeypatch.setattr(listings, "businesses_collection", mongo_db.businesses)
    monkeypatch.setattr(listings, "listings_collection", mongo_db.listings)
    now = datetime.now(timezone.utc)
    result = listings.create_listing(ListingCreate(
        title="Bread box", category="bakery", original_price=10, discounted_price=5,
        quantity=3, sale_deadline=now + timedelta(hours=1), pickup_deadline=now + timedelta(hours=2),
        fulfillment_type="pickup", image_url="https://example.test/bread.jpg", suitable_meals=["breakfast"],
    ), {"_id": user_id, "role": "business"})
    assert result["listing_id"]
    assert mongo_db.listings.count_documents({"business_id": str(business_id)}) == 1


def test_verified_charity_claim_is_atomic(monkeypatch, mongo_db):
    donation_id, charity_id, business_id = ObjectId(), ObjectId(), ObjectId()
    mongo_db.charities.insert_one({"_id": charity_id, "user_id": "charity-user", "verification_status": "verified", "organization_name": "Hope"})
    mongo_db.donations.insert_one({"_id": donation_id, "business_id": str(business_id), "title": "Meals", "status": "available"})
    monkeypatch.setattr(donations, "charities_collection", mongo_db.charities)
    monkeypatch.setattr(donations, "donations_collection", mongo_db.donations)
    monkeypatch.setattr(donations, "businesses_collection", mongo_db.businesses)
    result = donations.claim_donation(str(donation_id), {"_id": "charity-user", "role": "charity"})
    assert "successfully" in result["message"]
    assert mongo_db.donations.find_one({"_id": donation_id})["status"] == "claimed"


def test_completed_order_allows_one_review(monkeypatch, mongo_db):
    listing_id, order_id, customer_id = ObjectId(), ObjectId(), ObjectId()
    customer_id_text = str(customer_id)
    mongo_db.users.insert_one({"_id": customer_id, "first_name": "Test", "last_name": "Customer"})
    mongo_db.orders.insert_one({"_id": order_id, "customer_id": customer_id_text, "order_status": "completed", "items": [{"listing_id": str(listing_id)}]})
    monkeypatch.setattr(reviews, "orders_collection", mongo_db.orders)
    monkeypatch.setattr(reviews, "reviews_collection", mongo_db.reviews)
    monkeypatch.setattr(reviews, "listings_collection", mongo_db.listings)
    monkeypatch.setattr(reviews, "businesses_collection", mongo_db.businesses)
    monkeypatch.setattr(reviews, "users_collection", mongo_db.users)
    first = reviews.review_listing(str(listing_id), ReviewCreate(rating=5, comment="Great"), {"_id": customer_id_text})
    assert first["rating"] == 5
    assert first["reviewer_name"] == "Test Customer"

    with pytest.raises(HTTPException) as duplicate:
        reviews.review_listing(
            str(listing_id),
            ReviewCreate(rating=4, comment="Second review"),
            {"_id": customer_id_text},
        )
    assert duplicate.value.status_code == 409
