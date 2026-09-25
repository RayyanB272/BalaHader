from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone

from app.database import notifications_collection
from app.utils.dependencies import get_current_user


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.get("/")
def get_notifications(
    current_user=Depends(get_current_user)
):
    notifications = list(
        notifications_collection.find({
            "user_id": current_user["_id"]
        }).sort("created_at", -1)
    )

    for notification in notifications:
        notification["_id"] = str(notification["_id"])

    return notifications


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user=Depends(get_current_user)
):
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid notification ID"
        )

    result = notifications_collection.update_one(
        {
            "_id": ObjectId(notification_id),
            "user_id": current_user["_id"]
        },
        {
            "$set": {
                "is_read": True,
                "read_at": datetime.now(timezone.utc)
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    return {
        "message": "Notification marked as read"
    }


@router.patch("/read-all")
def mark_all_notifications_read(
    current_user=Depends(get_current_user)
):
    notifications_collection.update_many(
        {
            "user_id": current_user["_id"],
            "is_read": False
        },
        {
            "$set": {
                "is_read": True,
                "read_at": datetime.now(timezone.utc)
            }
        }
    )

    return {
        "message": "All notifications marked as read"
    }