import json

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta, timezone

from app.database import (
    businesses_collection,
    listings_collection,
    delivery_areas_collection
)

from app.utils.dependencies import require_role
from app.schemas.ai import (
    SellerInsightsRequest,
    SmartBasketRequest
)

from app.services.ai_service import (
    generate_seller_insight,
    generate_smart_basket
)

from bson import ObjectId

router = APIRouter(
    prefix="/ai",
    tags=["AI"]
)


@router.post("/seller-insights")
def seller_insights(
    data: SellerInsightsRequest,
    current_user=Depends(require_role("business"))
):
    if data.days <= 0 or data.days > 365:
        raise HTTPException(
            status_code=400,
            detail="Days must be between 1 and 365"
        )

    business = businesses_collection.find_one({
        "user_id": current_user["_id"]
    })

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business profile not found"
        )

    now = datetime.now(timezone.utc)

    start_date = now - timedelta(
        days=data.days
    )

    listings = list(
        listings_collection.find({
            "business_id": str(business["_id"]),
            "created_at": {
                "$gte": start_date
            }
        })
    )

    if not listings:
        raise HTTPException(
            status_code=404,
            detail="No listing data found for this period"
        )

    grouped = {}

    for listing in listings:
        title = listing["title"].strip()

        original_quantity = listing.get(
            "original_quantity",
            listing.get("quantity", 0)
        )

        quantity_sold = listing.get(
            "quantity_sold",
            0
        )

        remaining_quantity = listing.get(
            "remaining_quantity",
            0
        )

        reserved_quantity = listing.get(
            "reserved_quantity",
            0
        )

        unsold_quantity = max(
            remaining_quantity - reserved_quantity,
            0
        )

        if title not in grouped:
            grouped[title] = {
                "title": title,
                "category": listing.get("category"),
                "times_listed": 0,
                "total_offered": 0,
                "total_sold": 0,
                "total_unsold": 0
            }

        grouped[title]["times_listed"] += 1
        grouped[title]["total_offered"] += original_quantity
        grouped[title]["total_sold"] += quantity_sold
        grouped[title]["total_unsold"] += unsold_quantity

    stats = []

    for item in grouped.values():
        if item["total_offered"] > 0:
            item["unsold_rate"] = round(
                (
                    item["total_unsold"]
                    / item["total_offered"]
                ) * 100,
                2
            )
        else:
            item["unsold_rate"] = 0

        stats.append(item)

    try:
        insight = generate_seller_insight(
            business_name=business["business_name"],
            stats=stats,
            days=data.days
        )
    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error)
        ) from error

    return {
        "date_range_days": data.days,
        "sample_size": len(listings),
        "statistics": stats,
        "ai_insight": insight
    }

@router.post("/smart-basket")
def smart_basket(
    data: SmartBasketRequest,
    current_user=Depends(require_role("customer"))
):
    now = datetime.now(timezone.utc)

    query = {
        "status": "active",
        "sale_deadline": {
            "$gt": now
        },
        "remaining_quantity": {
            "$gt": 0
        }
    }

    if data.fulfillment_type == "pickup":
        query["fulfillment_type"] = {
            "$in": ["pickup", "both"]
        }

    if data.fulfillment_type == "delivery":
        query["fulfillment_type"] = {
            "$in": ["delivery", "both"]
        }

    listings = list(
        listings_collection.find(query)
    )

    if not listings:
        raise HTTPException(
            status_code=404,
            detail="No eligible listings are currently available"
        )

    businesses = {}

    for listing in listings:
        available_quantity = (
            listing.get("remaining_quantity", 0)
            - listing.get("reserved_quantity", 0)
        )

        if available_quantity <= 0:
            continue

        business_id = listing["business_id"]

        business = businesses_collection.find_one({
            "_id": ObjectId(business_id)
        })

        if not business:
            continue

        delivery_fee = 0

        if data.fulfillment_type == "delivery":
            if not data.area_code:
                continue

            delivery_area = delivery_areas_collection.find_one({
                "business_id": business_id,
                "area_code": data.area_code.upper()
            })

            if not delivery_area:
                continue

            delivery_fee = delivery_area.get(
                "delivery_fee",
                0
            )

        if business_id not in businesses:
            businesses[business_id] = {
                "business_id": business_id,
                "business_name": business.get(
                    "business_name"
                ),
                "delivery_fee": delivery_fee,
                "listings": []
            }

        businesses[business_id]["listings"].append({
            "listing_id": str(listing["_id"]),
            "title": listing["title"],
            "category": listing.get("category"),
            "price": listing["discounted_price"],
            "available_quantity": available_quantity
        })

    business_options = list(
        businesses.values()
    )

    affordable_businesses = []

    for business in business_options:
        remaining_budget = (
            data.budget
            - business["delivery_fee"]
        )

        if remaining_budget <= 0:
            continue

        affordable_listings = []

        for listing in business["listings"]:
            if listing["price"] <= remaining_budget:
                affordable_listings.append(
                    listing
                )

        if affordable_listings:
            business["listings"] = affordable_listings
            affordable_businesses.append(
                business
            )

    if not affordable_businesses:
        raise HTTPException(
            status_code=404,
            detail="No basket options fit the requested budget"
        )

    request_data = {
        "budget": data.budget,
        "currency": data.currency,
        "people": data.people,
        "meals": data.meals,
        "meal_purpose": data.meal_purpose,
        "preferences": data.preferences,
        "area_code": data.area_code,
        "fulfillment_type": data.fulfillment_type
    }

    try:
        ai_response = generate_smart_basket(
            request_data=request_data,
            business_options=affordable_businesses
        )
    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error)
        ) from error

    try:
        basket = json.loads(
            ai_response
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="AI returned an invalid basket format"
        )

    business_id = basket.get(
        "business_id"
    )

    selected_business = next(
        (
            business
            for business in affordable_businesses
            if business["business_id"]
            == business_id
        ),
        None
    )

    if not selected_business:
        raise HTTPException(
            status_code=400,
            detail="AI selected an invalid business"
        )

    validated_items = []
    food_total = 0

    for selected_item in basket.get(
        "items",
        []
    ):
        listing_id = selected_item.get(
            "listing_id"
        )

        quantity = selected_item.get(
            "quantity",
            0
        )

        if (
            not isinstance(quantity, int)
            or quantity <= 0
        ):
            continue

        valid_listing = next(
            (
                listing
                for listing
                in selected_business["listings"]
                if listing["listing_id"]
                == listing_id
            ),
            None
        )

        if not valid_listing:
            continue

        if (
            quantity
            > valid_listing[
                "available_quantity"
            ]
        ):
            quantity = valid_listing[
                "available_quantity"
            ]

        remaining_for_food = (
            data.budget
            - selected_business["delivery_fee"]
            - food_total
        )
        affordable_quantity = int(
            remaining_for_food // valid_listing["price"]
        )
        quantity = min(quantity, affordable_quantity)
        if quantity <= 0:
            continue

        subtotal = (
            valid_listing["price"]
            * quantity
        )

        validated_items.append({
            "listing_id":
                valid_listing[
                    "listing_id"
                ],

            "title":
                valid_listing[
                    "title"
                ],

            "quantity":
                quantity,

            "unit_price":
                valid_listing[
                    "price"
                ],

            "subtotal":
                round(
                    subtotal,
                    2
                )
        })

        food_total += subtotal

    if not validated_items:
        raise HTTPException(
            status_code=400,
            detail="AI did not select any valid items"
        )

    delivery_fee = selected_business[
        "delivery_fee"
    ]

    if food_total + delivery_fee > data.budget:
        raise HTTPException(
            status_code=400,
            detail="Generated basket exceeds the requested budget"
        )

    target_servings = data.people * data.meals
    selected_units = sum(item["quantity"] for item in validated_items)

    # Guarantee at least one available food unit per person, per meal.
    # The AI chooses the combination; deterministic validation fills any
    # shortfall without exceeding stock or the customer's budget.
    candidates = sorted(
        selected_business["listings"],
        key=lambda listing: listing["price"]
    )

    while selected_units < target_servings:
        added = False
        for candidate in candidates:
            existing = next(
                (item for item in validated_items if item["listing_id"] == candidate["listing_id"]),
                None
            )
            current_quantity = existing["quantity"] if existing else 0
            if current_quantity >= candidate["available_quantity"]:
                continue
            if food_total + delivery_fee + candidate["price"] > data.budget:
                continue

            if existing:
                existing["quantity"] += 1
                existing["subtotal"] = round(existing["unit_price"] * existing["quantity"], 2)
            else:
                validated_items.append({
                    "listing_id": candidate["listing_id"],
                    "title": candidate["title"],
                    "quantity": 1,
                    "unit_price": candidate["price"],
                    "subtotal": round(candidate["price"], 2)
                })
            food_total += candidate["price"]
            selected_units += 1
            added = True
            if selected_units >= target_servings:
                break
        if not added:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"The current budget or stock cannot provide {data.meals} "
                    f"meal{'s' if data.meals != 1 else ''} for {data.people} people. "
                    "Increase the budget or reduce the number of meals."
                )
            )

    total = food_total + delivery_fee

    if total > data.budget:
        raise HTTPException(
            status_code=400,
            detail="Generated basket exceeds the requested budget"
        )

    return {
        "business_id":
            selected_business[
                "business_id"
            ],

        "business_name":
            selected_business[
                "business_name"
            ],

        "items":
            validated_items,

        "food_total":
            round(
                food_total,
                2
            ),

        "delivery_fee":
            round(
                delivery_fee,
                2
            ),

        "total":
            round(
                total,
                2
            ),

        "budget":
            data.budget,

        "people": data.people,

        "meals": data.meals,

        "servings": selected_units,

        "currency":
            data.currency,

        "reason":
            basket.get(
                "reason"
            ),

        "stock_reserved":
            False,

        "order_created":
            False
    }
