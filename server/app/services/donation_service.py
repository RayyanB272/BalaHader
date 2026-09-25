from datetime import datetime, timezone

from app.database import (
    listings_collection,
    donations_collection,
    businesses_collection
)

from bson import ObjectId

def convert_expired_listings_to_donations():
    now = datetime.now(timezone.utc)

    listings = list(
        listings_collection.find({
            "status": "active",
            "donate_if_unsold": True,
            "donation_eligible": True,
            "sale_deadline": {
                "$lte": now
            },
            "pickup_deadline": {
                "$gt": now
            }
        })
    )

    for listing in listings:

        remaining_quantity = listing.get(
            "remaining_quantity",
            0
        )

        reserved_quantity = listing.get(
            "reserved_quantity",
            0
        )

        free_quantity = (
            remaining_quantity
            - reserved_quantity
        )

        if free_quantity <= 0:
            continue

        # Atomically remove only the currently free quantity.
        # If another worker already changed the stock,
        # this update will fail and prevent duplicates.
        result = listings_collection.update_one(
            {
                "_id": listing["_id"],
                "remaining_quantity":
                    remaining_quantity,
                "reserved_quantity":
                    reserved_quantity
            },
            {
                "$inc": {
                    "remaining_quantity":
                        -free_quantity
                },
                "$set": {
                    "updated_at": now
                }
            }
        )

        if result.modified_count == 0:
            continue

        business = businesses_collection.find_one({
            "_id": ObjectId(
                listing["business_id"]
            )
        })

        try:
            donation = {
                "listing_id":
                    str(listing["_id"]),

                "business_id":
                    listing["business_id"],

                "charity_id":
                    None,

                "title":
                    listing["title"],

                "category":
                    listing.get("category"),

                "image_url":
                    listing.get("image_url"),

                "quantity":
                    free_quantity,

                "status":
                    "available",

                "pickup_deadline":
                    listing["pickup_deadline"],

                "business_snapshot": {
                    "business_name":
                        (
                            business.get(
                                "business_name"
                            )
                            if business
                            else None
                        ),

                    "address":
                        (
                            business.get("address")
                            if business
                            else None
                        ),

                    "area":
                        (
                            business.get("area")
                            if business
                            else None
                        )
                },

                "auto_generated":
                    True,

                "available_at":
                    now,

                "claimed_at":
                    None,

                "collected_at":
                    None,

                "completed_at":
                    None,

                "created_at":
                    now,

                "updated_at":
                    now
            }

            donations_collection.insert_one(
                donation
            )

        except Exception:
            # Restore quantity if donation creation fails
            listings_collection.update_one(
                {
                    "_id": listing["_id"]
                },
                {
                    "$inc": {
                        "remaining_quantity":
                            free_quantity
                    },
                    "$set": {
                        "updated_at": now
                    }
                }
            )

            continue

        # Close listing if no quantity remains for sale
        updated_listing = (
            listings_collection.find_one({
                "_id": listing["_id"]
            })
        )

        if (
            updated_listing
            and updated_listing.get(
                "remaining_quantity",
                0
            ) == 0
        ):
            listings_collection.update_one(
                {
                    "_id": listing["_id"]
                },
                {
                    "$set": {
                        "status": "closed",
                        "closed_at": now,
                        "updated_at": now
                    }
                }
            )
