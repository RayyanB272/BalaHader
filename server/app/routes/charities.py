from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone

from app.database import charities_collection
from app.schemas.charity import CharityCreate, CharityUpdate
from app.utils.dependencies import require_role


router = APIRouter(
    prefix="/charities",
    tags=["Charities"]
)

@router.post("/profile")
def create_charity_profile(
    data: CharityCreate,
    current_user=Depends(require_role("charity"))
):
    existing = charities_collection.find_one({
        "user_id": current_user["_id"]
    })

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Charity profile already exists"
        )

    charity = {
        "user_id": current_user["_id"],
        "organization_name": data.organization_name,
        "description": data.description,
        "phone": data.phone,
        "address": data.address,
        "area": data.area,

        "verification_document_url":
            data.verification_document_url,

        "verification_status": "pending",
        "verified_by": None,
        "verified_at": None,

        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    result = charities_collection.insert_one(charity)

    return {
        "message": "Charity profile created successfully",
        "charity_id": str(result.inserted_id),
        "verification_status": "pending"
    }

@router.get("/me")
def get_my_charity_profile(
    current_user=Depends(require_role("charity"))
):
    charity = charities_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not charity:
        raise HTTPException(
            status_code=404,
            detail="Charity profile not found"
        )

    charity["_id"] = str(charity["_id"])

    return charity

@router.patch("/profile")
def update_charity_profile(
    data: CharityUpdate,
    current_user=Depends(require_role("charity"))
):
    charity = charities_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not charity:
        raise HTTPException(
            status_code=404,
            detail="Charity profile not found"
        )

    update_data = data.model_dump(exclude_none=True)

    text_fields = [
        "organization_name",
        "description",
        "phone",
        "address",
        "area",
        "verification_document_url"
    ]

    for field in text_fields:
        if field in update_data:
            update_data[field] = update_data[field].strip()

    required_fields = [
        "organization_name",
        "phone",
        "address",
        "area"
    ]

    for field in required_fields:
        if field in update_data and not update_data[field]:
            raise HTTPException(
                status_code=400,
                detail=f"{field.replace('_', ' ').title()} cannot be empty"
            )

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No profile changes were provided"
        )

    update_data["updated_at"] = datetime.now(timezone.utc)

    charities_collection.update_one(
        {
            "_id": charity["_id"]
        },
        {
            "$set": update_data
        }
    )

    updated_charity = charities_collection.find_one({
        "_id": charity["_id"]
    })

    updated_charity["_id"] = str(
        updated_charity["_id"]
    )

    return updated_charity