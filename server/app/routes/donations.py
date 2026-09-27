from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId

from app.database import (
    businesses_collection,
    charities_collection,
    listings_collection,
    donations_collection
)

from app.schemas.donation import DonationCreate
from app.utils.dependencies import require_role
from app.services.notification_service import create_notification


router = APIRouter(
    prefix="/donations",
    tags=["Donations"]
)


def serialize_donation(donation):
    donation["_id"] = str(donation["_id"])
    if not donation.get("image_url"):
        listing = None
        listing_id = donation.get("listing_id", "")

        if ObjectId.is_valid(str(listing_id)):
            listing = listings_collection.find_one({
                "_id": ObjectId(str(listing_id))
            })

        # Support legacy donations that were created without a usable listing ID.
        if not listing and donation.get("title"):
            legacy_query = {"title": donation["title"]}
            if donation.get("business_id"):
                legacy_query["business_id"] = donation["business_id"]
            listing = listings_collection.find_one(legacy_query)

        # Older seed versions used a different business-id representation.
        # The title-only lookup still restores the original listing image for
        # those records.
        if not listing and donation.get("title"):
            listing = listings_collection.find_one(
                {"title": donation["title"]},
                sort=[("created_at", -1)]
            )

        if listing and listing.get("image_url"):
            donation["image_url"] = listing["image_url"]
            donations_collection.update_one(
                {"_id": ObjectId(donation["_id"])},
                {"$set": {"image_url": listing["image_url"]}}
            )
    return donation


@router.post("/")
def create_donation(
    data: DonationCreate,
    current_user=Depends(require_role("business"))
):
    if not ObjectId.is_valid(data.listing_id):
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
        "_id": ObjectId(data.listing_id),
        "business_id": str(business["_id"])
    })

    if not listing:
        raise HTTPException(
            status_code=404,
            detail="Listing not found"
        )

    if data.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Donation quantity must be greater than 0"
        )

    reserved_quantity = listing.get(
        "reserved_quantity",
        0
    )

    free_quantity = (
        listing["remaining_quantity"]
        - reserved_quantity
    )

    if data.quantity > free_quantity:
        raise HTTPException(
            status_code=400,
            detail="Donation quantity exceeds free remaining quantity"
        )

    now = datetime.now(timezone.utc)

    donation = {
        "listing_id": data.listing_id,
        "business_id": str(business["_id"]),
        "charity_id": None,
        "title": listing["title"],
        "category": listing.get("category"),
        "image_url": listing.get("image_url"),
        "quantity": data.quantity,
        "status": "available",
        "pickup_deadline": listing.get("pickup_deadline"),
        "auto_generated": False,
        "available_at": now,
        "claimed_at": None,
        "collected_at": None,
        "completed_at": None,
        "created_at": now,
        "updated_at": now
    }

    result = donations_collection.insert_one(
        donation
    )

    listings_collection.update_one(
        {
            "_id": ObjectId(
                data.listing_id
            )
        },
        {
            "$inc": {
                "remaining_quantity":
                    -data.quantity
            },
            "$set": {
                "updated_at": now
            }
        }
    )

    return {
        "message": "Donation created successfully",
        "donation_id": str(result.inserted_id)
    }


@router.get("/business")
def get_business_donations(
    current_user=Depends(
        require_role("business")
    )
):
    business = businesses_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    donations = list(
        donations_collection.find({
            "business_id":
                str(business["_id"])
        }).sort(
            "created_at",
            -1
        )
    )

    donations = [serialize_donation(donation) for donation in donations]

    return donations


@router.get("/charity-orders")
def get_charity_orders(
    current_user=Depends(require_role("charity"))
):
    """Return a charity's claimed donation orders/history."""
    charity = charities_collection.find_one({
        "user_id": current_user["_id"]
    })
    if not charity:
        raise HTTPException(status_code=404, detail="Charity profile not found")

    donations = list(donations_collection.find({
        "charity_id": str(charity["_id"])
    }).sort("created_at", -1))
    donations = [serialize_donation(donation) for donation in donations]
    return donations


@router.get("/available")
def get_available_donations(
    current_user=Depends(
        require_role("charity")
    )
):
    charity = charities_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not charity:
        raise HTTPException(
            status_code=404,
            detail="Charity profile not found"
        )

    if (
        charity.get("verification_status")
        != "verified"
    ):
        raise HTTPException(
            status_code=403,
            detail="Only verified charities can view donations"
        )

    donations = list(
        donations_collection.find({
            "status": "available"
        }).sort(
            "created_at",
            -1
        )
    )

    donations = [serialize_donation(donation) for donation in donations]

    return donations


@router.post("/{donation_id}/claim")
def claim_donation(
    donation_id: str,
    current_user=Depends(
        require_role("charity")
    )
):
    if not ObjectId.is_valid(
        donation_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid donation ID"
        )

    charity = charities_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not charity:
        raise HTTPException(
            status_code=404,
            detail="Charity profile not found"
        )

    if (
        charity.get("verification_status")
        != "verified"
    ):
        raise HTTPException(
            status_code=403,
            detail="Charity must be verified first"
        )

    donation = donations_collection.find_one({
        "_id": ObjectId(
            donation_id
        ),
        "status": "available"
    })

    if not donation:
        raise HTTPException(
            status_code=400,
            detail="Donation is no longer available"
        )

    now = datetime.now(timezone.utc)

    result = donations_collection.update_one(
        {
            "_id": ObjectId(
                donation_id
            ),
            "status": "available"
        },
        {
            "$set": {
                "charity_id":
                    str(charity["_id"]),
                "status":
                    "claimed",
                "claimed_at":
                    now,
                "updated_at":
                    now
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=400,
            detail="Donation is no longer available"
        )

    business = businesses_collection.find_one({
        "_id": ObjectId(
            donation["business_id"]
        )
    })

    if business:
        create_notification(
            user_id=business["user_id"],
            notification_type="donation_claimed",
            title="Donation Claimed",
            message=(
                f"{charity['organization_name']} "
                f"claimed your donation: "
                f"{donation['title']}."
            )
        )

    return {
        "message": "Donation claimed successfully"
    }


@router.get("/my-claimed")
def get_my_claimed_donations(
    current_user=Depends(
        require_role("charity")
    )
):
    charity = charities_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not charity:
        raise HTTPException(
            status_code=404,
            detail="Charity profile not found"
        )

    donations = list(
        donations_collection.find({
            "charity_id":
                str(charity["_id"])
        }).sort(
            "created_at",
            -1
        )
    )

    donations = [serialize_donation(donation) for donation in donations]

    return donations


@router.patch("/{donation_id}/ready")
def mark_ready_for_pickup(
    donation_id: str,
    current_user=Depends(
        require_role("business")
    )
):
    if not ObjectId.is_valid(
        donation_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid donation ID"
        )

    business = businesses_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    donation = donations_collection.find_one({
        "_id": ObjectId(
            donation_id
        ),
        "business_id":
            str(business["_id"])
    })

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation not found"
        )

    if donation["status"] != "claimed":
        raise HTTPException(
            status_code=400,
            detail="Donation must be claimed first"
        )

    now = datetime.now(timezone.utc)

    donations_collection.update_one(
        {
            "_id": ObjectId(
                donation_id
            )
        },
        {
            "$set": {
                "status":
                    "ready_for_pickup",
                "updated_at":
                    now
            }
        }
    )

    if donation.get("charity_id"):
        charity = charities_collection.find_one({
            "_id": ObjectId(
                donation["charity_id"]
            )
        })

        if charity:
            create_notification(
                user_id=charity["user_id"],
                notification_type="donation_ready",
                title="Donation Ready for Pickup",
                message=(
                    f"{donation['title']} "
                    "is now ready for pickup."
                )
            )

    return {
        "message": "Donation is ready for pickup"
    }


@router.patch("/{donation_id}/collect")
def collect_donation(
    donation_id: str,
    current_user=Depends(
        require_role("charity")
    )
):
    if not ObjectId.is_valid(
        donation_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid donation ID"
        )

    charity = charities_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not charity:
        raise HTTPException(
            status_code=404,
            detail="Charity profile not found"
        )

    donation = donations_collection.find_one({
        "_id": ObjectId(
            donation_id
        ),
        "charity_id":
            str(charity["_id"])
    })

    if not donation:
        raise HTTPException(
            status_code=404,
            detail="Donation not found"
        )

    if (
        donation["status"]
        != "ready_for_pickup"
    ):
        raise HTTPException(
            status_code=400,
            detail="Donation is not ready for pickup"
        )

    now = datetime.now(timezone.utc)

    donations_collection.update_one(
        {
            "_id": ObjectId(
                donation_id
            )
        },
        {
            "$set": {
                "status":
                    "completed",
                "collected_at":
                    now,
                "completed_at":
                    now,
                "updated_at":
                    now
            }
        }
    )

    business = businesses_collection.find_one({
        "_id": ObjectId(
            donation["business_id"]
        )
    })

    if business:
        create_notification(
            user_id=business["user_id"],
            notification_type="donation_collected",
            title="Donation Collected",
            message=(
                f"{donation['title']} "
                "was successfully collected "
                "by the charity."
            )
        )

    return {
        "message": "Donation collected successfully"
    }
