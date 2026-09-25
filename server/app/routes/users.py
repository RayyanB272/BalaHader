from fastapi import APIRouter, Depends

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