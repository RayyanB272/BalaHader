from imagekitio import ImageKit
from app.config import settings


imagekit = ImageKit(
    private_key=settings.IMAGEKIT_PRIVATE_KEY
)


def upload_image(
    file_bytes: bytes,
    file_name: str,
    folder: str = "/balahader/food-listings"
):
    result = imagekit.files.upload(
        file=file_bytes,
        file_name=file_name,
        folder=folder
    )

    return {
        "image_url": result.url,
        "file_id": result.file_id
    }


def upload_food_image(file_bytes: bytes, file_name: str):
    return upload_image(file_bytes, file_name)
