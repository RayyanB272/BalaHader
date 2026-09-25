from fastapi import (
    APIRouter,
    Depends,
    File,
    UploadFile,
    HTTPException
)

from app.services.imagekit_service import upload_food_image, upload_image
from app.utils.dependencies import require_role


router = APIRouter(
    prefix="/uploads",
    tags=["Uploads"]
)


ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
]


@router.post("/food-image")
async def upload_food_photo(
    file: UploadFile = File(...),
    current_user=Depends(require_role("business"))
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, and WEBP images are allowed"
        )

    contents = await file.read()

    max_size = 5 * 1024 * 1024

    if len(contents) > max_size:
        raise HTTPException(
            status_code=400,
            detail="Image must be smaller than 5 MB"
        )

    try:
        result = upload_food_image(
            contents,
            file.filename
        )

        return {
            "message": "Image uploaded successfully",
            "image_url": result["image_url"],
            "file_id": result["file_id"]
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Image upload failed"
        )


@router.post("/verification-document")
async def upload_verification_document(
    file: UploadFile = File(...),
    current_user=Depends(require_role("charity"))
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, and WEBP images are allowed"
        )

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Verification image must be smaller than 5 MB"
        )

    try:
        result = upload_image(
            contents,
            file.filename or "verification-document",
            folder="/balahader/charity-verification"
        )
        return {
            "message": "Verification document uploaded successfully",
            "image_url": result["image_url"],
            "file_id": result["file_id"]
        }
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Verification document upload failed"
        ) from error
