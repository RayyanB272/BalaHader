from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone

from app.database import users_collection
from app.schemas.user import UserUpdate
from app.utils.dependencies import (
    get_current_user,
    require_role
)

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.get("/me")
def get_my_profile(
    current_user=Depends(get_current_user)
):
    return {
        "id": current_user["_id"],
        "first_name": current_user["first_name"],
        "last_name": current_user["last_name"],
        "email": current_user["email"],
        "phone": current_user.get("phone"),
        "role": current_user["role"],
        "status": current_user["status"]
    }


@router.get("/admin-test")
def admin_only(
    current_user=Depends(require_role("admin"))
):
    return {
        "message": "You are allowed to access the admin route"
    }


@router.patch("/me")
def update_my_profile(
    data: UserUpdate,
    current_user=Depends(get_current_user)
):
    changes = data.model_dump(exclude_unset=True)

    for field in ("first_name", "last_name", "phone"):
        if field in changes and changes[field] is not None:
            changes[field] = changes[field].strip()

    for field in ("first_name", "last_name"):
        if field in changes and not changes[field]:
            raise HTTPException(status_code=400, detail=f"{field.replace('_', ' ').title()} is required")

    if "email" in changes:
        changes["email"] = str(changes["email"]).lower().strip()
        duplicate = users_collection.find_one({
            "email": changes["email"],
            "_id": {"$ne": ObjectId(current_user["_id"])}
        })
        if duplicate:
            raise HTTPException(status_code=400, detail="This email is already in use")

    if not changes:
        raise HTTPException(status_code=400, detail="No profile changes were provided")

    changes["updated_at"] = datetime.now(timezone.utc)
    users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": changes}
    )

    updated = users_collection.find_one({"_id": ObjectId(current_user["_id"])})
    return {
        "id": str(updated["_id"]),
        "first_name": updated["first_name"],
        "last_name": updated["last_name"],
        "email": updated["email"],
        "phone": updated.get("phone"),
        "role": updated["role"],
        "status": updated["status"]
    }
