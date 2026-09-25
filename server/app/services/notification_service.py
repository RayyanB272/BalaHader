from datetime import datetime, timezone
from app.database import notifications_collection


def create_notification(
    user_id: str,
    notification_type: str,
    title: str,
    message: str
):
    notification = {
        "user_id": user_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "is_read": False,
        "created_at": datetime.now(timezone.utc)
    }

    notifications_collection.insert_one(notification)