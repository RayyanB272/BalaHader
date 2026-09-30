from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ReturnDocument

from app.database import (
    stock_holds_collection,
    listings_collection,
    orders_collection
)
from app.services.transaction_service import run_transaction, session_options


def release_hold(hold_id: str, final_status: str = "released"):
    if not ObjectId.is_valid(hold_id):
        return False

    now = datetime.now(timezone.utc)

    def release(session):
        options = session_options(session)
        # Claim the hold before changing inventory. Only one concurrent caller
        # can move it out of active, so reserved stock is never released twice.
        hold = stock_holds_collection.find_one_and_update(
            {"_id": ObjectId(hold_id), "status": "active"},
            {"$set": {"status": "releasing", "updated_at": now}},
            return_document=ReturnDocument.BEFORE,
            **options,
        )

        if not hold:
            return False

        updated_items = []
        for item in hold["items"]:
            if not ObjectId.is_valid(item["listing_id"]):
                continue

            result = listings_collection.update_one(
                {
                    "_id": ObjectId(item["listing_id"]),
                    "reserved_quantity": {"$gte": item["quantity"]},
                },
                {
                    "$inc": {"reserved_quantity": -item["quantity"]},
                    "$set": {"updated_at": now},
                },
                **options,
            )
            if result.modified_count != 1:
                if session is None:
                    for updated in updated_items:
                        listings_collection.update_one(
                            {"_id": ObjectId(updated["listing_id"])},
                            {"$inc": {"reserved_quantity": updated["quantity"]}},
                        )
                    stock_holds_collection.update_one(
                        {"_id": ObjectId(hold_id), "status": "releasing"},
                        {"$set": {"status": "active", "updated_at": now}},
                    )
                    return False
                raise RuntimeError("Reserved stock changed while releasing the hold")
            updated_items.append(item)

        stock_holds_collection.update_one(
            {"_id": ObjectId(hold_id), "status": "releasing"},
            {
                "$set": {
                    "status": final_status,
                    "released_at": now,
                    "updated_at": now,
                }
            },
            **options,
        )
        return True

    return run_transaction(release)


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
