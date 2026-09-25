from datetime import datetime, timezone
from bson import ObjectId

from app.database import (
    stock_holds_collection,
    listings_collection,
    orders_collection
)


def release_hold(hold_id: str, final_status: str = "released"):
    if not ObjectId.is_valid(hold_id):
        return False

    hold = stock_holds_collection.find_one({
        "_id": ObjectId(hold_id),
        "status": "active"
    })

    if not hold:
        return False

    now = datetime.now(timezone.utc)

    for item in hold["items"]:
        if not ObjectId.is_valid(item["listing_id"]):
            continue

        listings_collection.update_one(
            {
                "_id": ObjectId(item["listing_id"])
            },
            {
                "$inc": {
                    "reserved_quantity": -item["quantity"]
                },
                "$set": {
                    "updated_at": now
                }
            }
        )

    stock_holds_collection.update_one(
        {
            "_id": ObjectId(hold_id),
            "status": "active"
        },
        {
            "$set": {
                "status": final_status,
                "released_at": now,
                "updated_at": now
            }
        }
    )

    return True


def expire_old_holds():
    now = datetime.now(timezone.utc)

    expired_holds = list(
        stock_holds_collection.find({
            "status": "active",
            "expires_at": {
                "$lte": now
            }
        })
    )

    for hold in expired_holds:
        hold_id = str(hold["_id"])

        released = release_hold(
            hold_id,
            final_status="expired"
        )

        if released:
            orders_collection.update_many(
                {
                    "stock_hold_id": hold_id,
                    "payment_status": "pending"
                },
                {
                    "$set": {
                        "payment_status": "expired",
                        "order_status": "cancelled",
                        "updated_at": now
                    }
                }
            )