import json
import re

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
from app.services import smart_basket_builder

from bson import ObjectId

router = APIRouter(
    prefix="/ai",
    tags=["AI"]
)


PURPOSE_CATEGORIES = {
    "breakfast": {"bakery": 5, "dairy": 4, "drinks": 2},
    "lunch": {"prepared_meals": 5, "bakery": 2, "fresh_produce": 2},
    "dinner": {"prepared_meals": 5, "bakery": 2, "fresh_produce": 2},
    "snacks": {"snacks": 5, "desserts": 4, "drinks": 3, "bakery": 2},
    "gathering": {"prepared_meals": 4, "bakery": 3, "desserts": 3, "snacks": 2, "drinks": 2},
}


def build_fallback_seller_insight(stats, days):
    """Return a useful insight without making the dashboard depend on Ollama."""
    offered = sum(item.get("total_offered", 0) for item in stats)
    sold = sum(item.get("total_sold", 0) for item in stats)
    unsold = sum(item.get("total_unsold", 0) for item in stats)
    sell_through = round((sold / offered) * 100, 1) if offered else 0
    top_item = max(stats, key=lambda item: item.get("total_sold", 0), default=None)
    top_title = top_item.get("title") if top_item else "your listings"

    lines = [
        f"Based on {len(stats)} listing types over the last {days} days, "
        f"you offered {offered} items and sold {sold} ({sell_through}% sell-through).",
    ]
    if top_item:
        lines.append(f"{top_title} was the strongest seller with {top_item.get('total_sold', 0)} sold.")
    if unsold:
        lines.append(f"There were {unsold} unsold items; consider smaller batches or earlier discounts for slower listings.")
    else:
        lines.append("All recorded items sold, so keeping similar quantities available may work well.")
    return " ".join(lines)

PREFERENCE_KEYWORDS = {
    "bakery": ("bakery", "bread", "croissant", "manakish", "pastry"),
    "prepared_meals": ("meal", "lunch", "dinner", "rice", "soup", "sandwich", "mezze"),
    "fresh_produce": ("produce", "fruit", "vegetable", "salad"),
    "dairy": ("dairy", "milk", "cheese", "yogurt", "yoghurt", "labneh"),
    "drinks": ("drink", "juice", "coffee", "beverage"),
    "desserts": ("dessert", "sweet", "cake", "baklava", "knefeh", "chocolate"),
    "snacks": ("snack", "nuts", "granola", "chips"),
}


def requested_categories(preferences):
    text = (preferences or "").lower()
    return {category for category, words in PREFERENCE_KEYWORDS.items() if any(word in text for word in words)}


def listing_match_score(listing, meal_purpose, preferences):
    category = listing.get("category", "")
    text = f"{listing.get('title', '')} {listing.get('description', '')} {category}".lower()
    preference_text = (preferences or "").lower()
    dietary_tags = set(listing.get("dietary_tags", []))
    if "vegetarian" in preference_text and "vegetarian" not in dietary_tags and any(word in text for word in ("chicken", "meat", "kafta", "beef", "fish")):
        return -100
    if any(phrase in preference_text for phrase in ("no dairy", "dairy free", "without dairy")) and (
        category == "dairy" or any(word in text for word in ("cheese", "milk", "yogurt", "yoghurt", "labneh"))
    ):
        return -100
    score = PURPOSE_CATEGORIES.get((meal_purpose or "").lower(), {}).get(category, 0)
    if (meal_purpose or "").lower() in listing.get("suitable_meals", []):
        score += 8
    if category in requested_categories(preferences):
        score += 8
    return score


NUMBER_WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "twelve": 12}


def infer_servings(title, description):
    """Infer portions from labels such as '(4)', '6 bottles', or 'serves two'."""
    title_text = title or ""
    text = f"{title_text} {description or ''}".lower()
    parenthetical = re.search(r"\((\d+)\)", title_text)
    if parenthetical:
        return max(1, int(parenthetical.group(1)))
    numeric = re.search(r"\b(\d+)\s*(?:slices?|cups?|bottles?|bars?|loaves?|sandwiches?|pieces?|items?|servings?|people|persons?)\b", text)
    if numeric:
        return max(1, int(numeric.group(1)))
    serves = re.search(r"\bserves?\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\b", text)
    if serves:
        value = serves.group(1)
        return int(value) if value.isdigit() else NUMBER_WORDS.get(value, 1)
    return 1


def flatten_candidates(businesses, meal_purpose, preferences, optimization_mode="best_match"):
    candidates = []
    for business in businesses:
        for listing in business["listings"]:
            if listing_match_score(listing, meal_purpose, preferences) <= -100:
                continue
            candidates.append({
                **listing,
                "business_id": business["business_id"],
                "business_name": business["business_name"],
                "delivery_fee": business["delivery_fee"],
            })
    if optimization_mode == "lowest_price":
        return sorted(candidates, key=lambda item: (item["price"], -listing_match_score(item, meal_purpose, preferences)))
    return sorted(candidates, key=lambda item: (-listing_match_score(item, meal_purpose, preferences), item["price"]))


def build_reliable_basket(businesses, budget, target_servings, people, meal_purpose="", preferences="", optimization_mode="best_match", locked_listing_ids=None):
    """Build a stock-safe basket across businesses, matched to the request."""
    candidates = flatten_candidates(businesses, meal_purpose, preferences, optimization_mode)
    chosen = []
    used_businesses = set()
    food_total = 0.0
    delivery_total = 0.0
    portions = 0

    def add_one(candidate):
        nonlocal food_total, delivery_total, portions
        existing = next((item for item in chosen if item["listing_id"] == candidate["listing_id"]), None)
        quantity = existing["quantity"] if existing else 0
        maximum_quantity = 1 if people == 1 or optimization_mode == "most_variety" else candidate["available_quantity"]
        if quantity >= maximum_quantity:
            return False
        extra_delivery = candidate["delivery_fee"] if candidate["business_id"] not in used_businesses else 0
        if food_total + delivery_total + extra_delivery + candidate["price"] > budget:
            return False
        if existing:
            existing["quantity"] += 1
        else:
            chosen.append({
                "listing_id": candidate["listing_id"],
                "title": candidate["title"],
                "quantity": 1,
                "business_id": candidate["business_id"],
                "business_name": candidate["business_name"],
            })
        food_total += candidate["price"]
        delivery_total += extra_delivery
        used_businesses.add(candidate["business_id"])
        portions += candidate.get("servings_per_unit", 1)
        return True

    for listing_id in locked_listing_ids or []:
        locked = next((item for item in candidates if item["listing_id"] == listing_id), None)
        if locked:
            add_one(locked)

    # When the customer names categories, include as many of them as stock and budget allow.
    for category in requested_categories(preferences):
        if portions >= target_servings:
            break
        match = next((item for item in candidates if item.get("category") == category), None)
        if match:
            add_one(match)

    while portions < target_servings:
        if not any(add_one(candidate) for candidate in candidates):
            break

    if portions < target_servings:
        return None

    return {
        "items": chosen,
        "reason": "Matched to your meal purpose and preferences across the closest available businesses.",
    }


def basket_match_score(basket, businesses, meal_purpose, preferences):
    catalog = {item["listing_id"]: item for item in flatten_candidates(businesses, meal_purpose, preferences)}
    score = 0
    for selected in basket.get("items", []):
        listing = catalog.get(selected.get("listing_id"))
        if not listing:
            return -1000
        score += listing_match_score(listing, meal_purpose, preferences)
    return score


# Keep the route focused on request validation and persistence. The matching
# engine lives in a standalone service so it can be tested without FastAPI.
requested_categories = smart_basket_builder.requested_categories
infer_servings = smart_basket_builder.infer_servings
flatten_candidates = smart_basket_builder.flatten_candidates
build_reliable_basket = smart_basket_builder.build_reliable_basket
basket_match_score = smart_basket_builder.basket_match_score


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
    except RuntimeError:
        # Ollama is optional. Keep the insights page useful when it is slow,
        # stopped, or unavailable by using the real statistics above.
        insight = build_fallback_seller_insight(stats, data.days)

    return {
        "date_range_days": data.days,
        "sample_size": len(listings),
        "statistics": stats,
        "ai_insight": insight
    }

@router.post("/smart-basket")
def smart_basket(data: SmartBasketRequest, current_user=Depends(require_role("customer"))):
    now = datetime.now(timezone.utc)
    query = {
        "status": "active",
        "sale_deadline": {"$gt": now},
        "remaining_quantity": {"$gt": 0},
        "fulfillment_type": {"$in": [data.fulfillment_type, "both"]},
    }
    excluded_ids = [ObjectId(value) for value in data.excluded_listing_ids if ObjectId.is_valid(value)]
    if excluded_ids:
        query["_id"] = {"$nin": excluded_ids}

    listings = list(listings_collection.find(query))
    if not listings:
        raise HTTPException(status_code=404, detail="No eligible listings are currently available")

    businesses = {}
    for listing in listings:
        available = listing.get("remaining_quantity", 0) - listing.get("reserved_quantity", 0)
        if available <= 0:
            continue
        business_id = str(listing["business_id"])
        if not ObjectId.is_valid(business_id):
            continue
        business = businesses_collection.find_one({"_id": ObjectId(business_id)})
        if not business:
            continue
        delivery_fee = 0
        if data.fulfillment_type == "delivery":
            if not data.area_code:
                continue
            area = delivery_areas_collection.find_one({
                "business_id": business_id,
                "area_code": data.area_code.upper(),
            })
            if not area:
                continue
            delivery_fee = float(area.get("delivery_fee", 0))
        businesses.setdefault(business_id, {
            "business_id": business_id,
            "business_name": business.get("business_name", "Local business"),
            "delivery_fee": delivery_fee,
            "listings": [],
        })["listings"].append({
            "listing_id": str(listing["_id"]),
            "title": listing["title"],
            "category": listing.get("category"),
            "description": listing.get("description", ""),
            "servings_per_unit": listing.get("servings_per_package") or infer_servings(listing.get("title", ""), listing.get("description", "")),
            "dietary_tags": listing.get("dietary_tags", []),
            "suitable_meals": listing.get("suitable_meals", []),
            "price": float(listing["discounted_price"]),
            "available_quantity": available,
        })

    business_options = [business for business in businesses.values() if business["listings"]]
    if not business_options:
        raise HTTPException(status_code=404, detail="No basket options fit the requested fulfillment method")

    target_servings = data.people * data.meals
    reliable = build_reliable_basket(
        business_options, data.budget, target_servings, data.people, data.meal_purpose, data.preferences or "", data.optimization_mode, data.locked_listing_ids
    )
    request_data = {
        "budget": data.budget,
        "currency": data.currency,
        "people": data.people,
        "meals": data.meals,
        "meal_purpose": data.meal_purpose,
        "preferences": data.preferences,
        "area_code": data.area_code,
        "fulfillment_type": data.fulfillment_type,
        "optimization_mode": data.optimization_mode,
        "locked_listing_ids": data.locked_listing_ids,
    }

    # A small, relevant catalog keeps local models responsive. The complete
    # catalog remains available to the deterministic validator below, so the
    # returned basket is always stock-safe and can still cover the request.
    shortlisted_ids = {
        item["listing_id"]
        for item in flatten_candidates(
            business_options,
            data.meal_purpose,
            data.preferences or "",
            data.optimization_mode,
        )[:14]
    }
    shortlisted_ids.update(data.locked_listing_ids or [])
    ai_options = []
    for business in business_options:
        listings = [
            listing
            for listing in business["listings"]
            if listing["listing_id"] in shortlisted_ids
        ]
        if listings:
            ai_options.append({**business, "listings": listings})

    try:
        basket = json.loads(generate_smart_basket(request_data, ai_options))
    except (RuntimeError, json.JSONDecodeError):
        basket = reliable

    if reliable and basket_match_score(reliable, business_options, data.meal_purpose, data.preferences or "") > basket_match_score(basket or {}, business_options, data.meal_purpose, data.preferences or ""):
        basket = reliable
    if data.locked_listing_ids:
        basket = reliable
    if not basket:
        raise HTTPException(status_code=422, detail=f"The current budget or stock cannot provide {data.meals} meal{'s' if data.meals != 1 else ''} for {data.people} people.")

    catalog = {item["listing_id"]: item for item in flatten_candidates(business_options, data.meal_purpose, data.preferences or "", data.optimization_mode)}
    validated = []
    used_businesses = set()
    food_total = 0.0
    delivery_total = 0.0

    def add_item(candidate, requested_quantity=1):
        nonlocal food_total, delivery_total
        existing = next((item for item in validated if item["listing_id"] == candidate["listing_id"]), None)
        current = existing["quantity"] if existing else 0
        maximum_quantity = 1 if data.people == 1 or data.optimization_mode == "most_variety" else candidate["available_quantity"]
        quantity = min(max(int(requested_quantity), 0), maximum_quantity - current)
        added = 0
        for _ in range(quantity):
            extra_delivery = candidate["delivery_fee"] if candidate["business_id"] not in used_businesses else 0
            if food_total + delivery_total + extra_delivery + candidate["price"] > data.budget:
                break
            if existing:
                existing["quantity"] += 1
                existing["subtotal"] = round(existing["quantity"] * existing["unit_price"], 2)
            else:
                existing = {
                    "listing_id": candidate["listing_id"],
                    "title": candidate["title"],
                    "quantity": 1,
                    "unit_price": candidate["price"],
                    "subtotal": round(candidate["price"], 2),
                    "business_id": candidate["business_id"],
                    "business_name": candidate["business_name"],
                    "servings_per_unit": candidate.get("servings_per_unit", 1),
                    "match_reason": (
                        "Matches a selected preference"
                        if candidate.get("category") in requested_categories(data.preferences or "")
                        else f"Suitable for {data.meal_purpose.lower()}"
                    ),
                }
                validated.append(existing)
            food_total += candidate["price"]
            delivery_total += extra_delivery
            used_businesses.add(candidate["business_id"])
            added += 1
        return added

    for selected in basket.get("items", []):
        candidate = catalog.get(selected.get("listing_id"))
        if candidate:
            add_item(candidate, selected.get("quantity", 1))

    candidates = list(catalog.values())
    while sum(item["quantity"] * item.get("servings_per_unit", 1) for item in validated) < target_servings:
        if not any(add_item(candidate) for candidate in candidates):
            raise HTTPException(status_code=422, detail="The budget or current stock cannot cover the requested number of portions.")

    total = food_total + delivery_total
    business_names = list(dict.fromkeys(item["business_name"] for item in validated))
    selected_categories = {catalog[item["listing_id"]].get("category") for item in validated}
    missing_preferences = sorted(requested_categories(data.preferences or "") - selected_categories)
    fee_breakdown = [
        {"business_id": business["business_id"], "business_name": business["business_name"], "delivery_fee": business["delivery_fee"]}
        for business in business_options if business["business_id"] in used_businesses
    ]
    return {
        "business_id": validated[0]["business_id"] if len(business_names) == 1 else "multiple",
        "business_name": business_names[0] if len(business_names) == 1 else f"{len(business_names)} local businesses",
        "business_count": len(business_names),
        "items": validated,
        "food_total": round(food_total, 2),
        "delivery_fee": round(delivery_total, 2),
        "total": round(total, 2),
        "budget": data.budget,
        "people": data.people,
        "meals": data.meals,
        "servings": sum(item["quantity"] * item.get("servings_per_unit", 1) for item in validated),
        "currency": data.currency,
        "reason": basket.get("reason") or "A practical multi-business basket from current stock.",
        "preference_note": (
            "Some preferences could not be matched: " + ", ".join(value.replace("_", " ") for value in missing_preferences)
            if missing_preferences else "All selected category preferences were matched."
        ),
        "businesses": fee_breakdown,
        "stock_reserved": False,
        "order_created": False,
    }
