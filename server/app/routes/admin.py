from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from pydantic import BaseModel, Field
import stripe

from app.database import (
    users_collection,
    businesses_collection,
    charities_collection,
    listings_collection,
    orders_collection,
    donations_collection,
    platform_settings_collection
)

from app.utils.dependencies import require_role

from app.config import settings
from app.database import payments_collection
from app.services.transaction_service import run_transaction, session_options

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

stripe.api_key = settings.STRIPE_SECRET_KEY

class CommissionUpdate(BaseModel):
    commission_rate_bps: int = Field(
        ge=0,
        le=10000
    )

class AdminReason(BaseModel):
    reason: str = Field(min_length=3, max_length=500)

class ReconciliationAction(BaseModel):
    action: str
    reason: str = Field(min_length=3, max_length=500)

@router.get("/charities/pending")
def get_pending_charities(
    current_user=Depends(require_role("admin"))
):
    charities = list(
        charities_collection.find({
            "verification_status": "pending"
        })
    )

    for charity in charities:
        charity["_id"] = str(charity["_id"])

    return charities

@router.patch("/charities/{charity_id}/verify")
def verify_charity(
    charity_id: str,
    data: AdminReason,
    current_user=Depends(require_role("admin"))
):
    if not ObjectId.is_valid(charity_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid charity ID"
        )

    charity = charities_collection.find_one({
        "_id": ObjectId(charity_id)
    })

    if not charity:
        raise HTTPException(
            status_code=404,
            detail="Charity not found"
        )

    now = datetime.now(timezone.utc)

    charities_collection.update_one(
        {
            "_id": ObjectId(charity_id)
        },
        {
            "$set": {
                "verification_status": "verified",
                "verification_reason": data.reason,
                "verified_by": current_user["_id"],
                "verified_at": now,
                "updated_at": now
            }
        }
    )

    return {
        "message": "Charity verified successfully",
        "reason": data.reason
    }

@router.patch("/charities/{charity_id}/reject")
def reject_charity(
    charity_id: str,
    data: AdminReason,
    current_user=Depends(require_role("admin"))
):
    if not ObjectId.is_valid(charity_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid charity ID"
        )

    now = datetime.now(timezone.utc)

    result = charities_collection.update_one(
        {
            "_id": ObjectId(charity_id)
        },
        {
            "$set": {
                "verification_status": "rejected",
                "verification_reason": data.reason,
                "verified_by": current_user["_id"],
                "verified_at": now,
                "updated_at": now
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Charity not found"
        )

    return {
        "message": "Charity rejected",
        "reason": data.reason
    }

@router.get("/users")
def get_all_users(
    current_user=Depends(require_role("admin"))
):
    users = list(
        users_collection.find().sort("created_at", -1)
    )

    for user in users:
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)

    return users

@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    status_value: str,
    current_user=Depends(require_role("admin"))
):
    if status_value not in ["active", "suspended"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be active or suspended"
        )

    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid user ID"
        )

    result = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "status": status_value,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "message": f"User status changed to {status_value}"
    }

@router.get("/businesses")
def get_all_businesses(
    current_user=Depends(require_role("admin"))
):
    businesses = list(
        businesses_collection.find().sort("created_at", -1)
    )

    for business in businesses:
        business["_id"] = str(business["_id"])
        owner = users_collection.find_one({"_id": ObjectId(business["user_id"])}) if ObjectId.is_valid(str(business.get("user_id", ""))) else None
        business["user_status"] = owner.get("status", "active") if owner else "unknown"

    return businesses

@router.get("/listings")
def get_all_listings(
    current_user=Depends(require_role("admin"))
):
    listings = list(
        listings_collection.find().sort("created_at", -1)
    )

    for listing in listings:
        listing["_id"] = str(listing["_id"])

    return listings

@router.patch("/listings/{listing_id}/disable")
def disable_listing(
    listing_id: str,
    data: AdminReason,
    current_user=Depends(require_role("admin"))
):
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid listing ID"
        )

    now = datetime.now(timezone.utc)

    result = listings_collection.update_one(
        {
            "_id": ObjectId(listing_id)
        },
        {
            "$set": {
                "status": "disabled",
                "disabled_reason": data.reason,
                "disabled_by": current_user["_id"],
                "disabled_at": now,
                "updated_at": now
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Listing not found"
        )

    return {
        "message": "Listing disabled successfully",
        "reason": data.reason
    }

@router.get("/orders")
def get_all_orders(
    current_user=Depends(require_role("admin"))
):
    orders = list(
        orders_collection.find().sort("created_at", -1)
    )

    for order in orders:
        order["_id"] = str(order["_id"])

    return orders

@router.get("/donations")
def get_all_donations(
    current_user=Depends(require_role("admin"))
):
    donations = list(
        donations_collection.find().sort("created_at", -1)
    )

    for donation in donations:
        donation["_id"] = str(donation["_id"])

    return donations

@router.get("/dashboard")
def get_admin_dashboard(
    current_user=Depends(require_role("admin"))
):
    total_users = users_collection.count_documents({})
    total_businesses = businesses_collection.count_documents({})
    total_charities = charities_collection.count_documents({})
    total_listings = listings_collection.count_documents({})
    total_orders = orders_collection.count_documents({})
    total_donations = donations_collection.count_documents({})

    verified_charities = charities_collection.count_documents({
        "verification_status": "verified"
    })

    pending_charities = charities_collection.count_documents({
        "verification_status": "pending"
    })

    active_listings = listings_collection.count_documents({
        "status": "active"
    })

    return {
        "total_users": total_users,
        "total_businesses": total_businesses,
        "total_charities": total_charities,
        "verified_charities": verified_charities,
        "pending_charities": pending_charities,
        "total_listings": total_listings,
        "active_listings": active_listings,
        "total_orders": total_orders,
        "total_donations": total_donations
    }

@router.get("/settings/commission")
def get_commission_setting(
    current_user=Depends(require_role("admin"))
):
    settings = platform_settings_collection.find_one({
        "key": "platform_settings"
    })

    if not settings:
        return {
            "commission_rate_bps": 1000,
            "commission_percent": 10
        }

    rate = settings.get(
        "commission_rate_bps",
        1000
    )

    return {
        "commission_rate_bps": rate,
        "commission_percent": rate / 100
    }


@router.patch("/settings/commission")
def update_commission_setting(
    data: CommissionUpdate,
    current_user=Depends(require_role("admin"))
):
    platform_settings_collection.update_one(
        {
            "key": "platform_settings"
        },
        {
            "$set": {
                "commission_rate_bps": data.commission_rate_bps,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

    return {
        "message": "Commission updated successfully",
        "commission_rate_bps": data.commission_rate_bps,
        "commission_percent": data.commission_rate_bps / 100
    }

@router.get("/charities")
def get_all_charities(
    current_user=Depends(require_role("admin"))
):
    charities = list(
        charities_collection.find().sort(
            "created_at",
            -1
        )
    )

    for charity in charities:
        charity["_id"] = str(
            charity["_id"]
        )
        owner = users_collection.find_one({"_id": ObjectId(charity["user_id"])}) if ObjectId.is_valid(str(charity.get("user_id", ""))) else None
        charity["user_status"] = owner.get("status", "active") if owner else "unknown"

    return charities

@router.patch("/orders/{order_id}/reconcile")
def reconcile_order(
    order_id: str,
    data: ReconciliationAction,
    current_user=Depends(require_role("admin"))
):
    if not ObjectId.is_valid(order_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid order ID"
        )

    if data.action not in ["refund", "approve"]:
        raise HTTPException(
            status_code=400,
            detail="Action must be refund or approve"
        )

    order = orders_collection.find_one({
        "_id": ObjectId(order_id)
    })

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    if order.get("order_status") != "reconciliation_required":
        raise HTTPException(
            status_code=400,
            detail="Order does not require reconciliation"
        )

    now = datetime.now(timezone.utc)

    if data.action == "refund":
        orders_collection.update_one(
            {
                "_id": ObjectId(order_id)
            },
            {
                "$set": {
                    "payment_status": "refund_pending",
                    "order_status": "cancelled",
                    "reconciliation_status": "refund_requested",
                    "reconciliation_reason": data.reason,
                    "reconciled_by": current_user["_id"],
                    "reconciled_at": now,
                    "updated_at": now
                }
            }
        )

        return {
            "message": "Order marked for refund",
            "status": "refund_pending"
        }

    orders_collection.update_one(
        {
            "_id": ObjectId(order_id)
        },
        {
            "$set": {
                "payment_status": "paid",
                "order_status": "confirmed",
                "reconciliation_status": "approved",
                "reconciliation_reason": data.reason,
                "reconciled_by": current_user["_id"],
                "reconciled_at": now,
                "updated_at": now
            }
        }
    )

    return {
        "message": "Order approved successfully",
        "status": "confirmed"
    }

@router.post("/orders/{order_id}/refund")
def refund_order(
    order_id: str,
    current_user=Depends(require_role("admin"))
):
    if not ObjectId.is_valid(order_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid order ID"
        )

    order = orders_collection.find_one({
        "_id": ObjectId(order_id)
    })

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    if order.get("payment_status") not in [
        "refund_pending",
        "paid_late"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Order is not eligible for refund"
        )

    payment = payments_collection.find_one({
        "$or": [
            {"order_id": order_id},
            {"order_ids": order_id}
        ],
        "status": {
            "$in": [
                "succeeded",
                "succeeded_late"
            ]
        }
    })

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Successful Stripe payment not found"
        )

    payment_intent_id = payment.get(
        "stripe_payment_intent_id"
    )

    if not payment_intent_id:
        raise HTTPException(
            status_code=400,
            detail="Stripe PaymentIntent ID not found"
        )

    try:
        refund_arguments = {
            "payment_intent": payment_intent_id
        }
        if payment.get("order_ids"):
            refund_arguments["amount"] = int(round(order["total_amount"] * 100))
        refund = stripe.Refund.create(**refund_arguments)

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Stripe refund failed: {str(error)}"
        )

    now = datetime.now(timezone.utc)

    def record_refund(session):
        options = session_options(session)
        orders_collection.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {
                "payment_status": "refunded",
                "order_status": "cancelled",
                "reconciliation_status": "refunded",
                "refunded_at": now,
                "stripe_refund_id": refund.id,
                "updated_at": now,
            }},
            **options,
        )
        payments_collection.update_one(
            {"_id": payment["_id"]},
            {"$set": {
                "status": "partially_refunded" if payment.get("order_ids") else "refunded",
                "stripe_refund_id": refund.id,
                "refunded_at": now,
                "updated_at": now,
            }},
            **options,
        )

    run_transaction(record_refund)

    return {
        "message": "Refund completed successfully",
        "refund_id": refund.id,
        "payment_status": "refunded"
    }
