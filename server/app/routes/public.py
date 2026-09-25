from fastapi import APIRouter

from app.database import (
    businesses_collection,
    charities_collection,
    donations_collection,
    listings_collection,
)

router = APIRouter(
    prefix="/public",
    tags=["Public"]
)


def _sum(collection, field, match=None):
    pipeline = []

    if match:
        pipeline.append({"$match": match})

    pipeline.append({
        "$group": {
            "_id": None,
            "total": {"$sum": f"${field}"}
        }
    })

    result = list(collection.aggregate(pipeline))

    return int(result[0]["total"]) if result else 0


@router.get("/stats")
def get_public_stats():
    """Real, anonymous platform totals for the landing page."""
    meals_sold = _sum(listings_collection, "quantity_sold")
    meals_donated = _sum(
        donations_collection,
        "quantity",
        {"status": "completed"}
    )

    return {
        "meals_saved": meals_sold + meals_donated,
        "businesses": businesses_collection.count_documents(
            {"status": "active"}
        ),
        "charities": charities_collection.count_documents(
            {"verification_status": "verified"}
        ),
        "donations_completed": donations_collection.count_documents(
            {"status": "completed"}
        ),
    }
