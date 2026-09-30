import re


PURPOSE_CATEGORIES = {
    "breakfast": {"bakery": 5, "dairy": 4, "drinks": 2},
    "lunch": {"prepared_meals": 5, "bakery": 2, "fresh_produce": 2},
    "dinner": {"prepared_meals": 5, "bakery": 2, "fresh_produce": 2},
    "snacks": {"snacks": 5, "desserts": 4, "drinks": 3, "bakery": 2},
    "gathering": {"prepared_meals": 4, "bakery": 3, "desserts": 3, "snacks": 2, "drinks": 2},
}

PREFERENCE_KEYWORDS = {
    "bakery": ("bakery", "bread", "croissant", "manakish", "pastry"),
    "prepared_meals": ("meal", "lunch", "dinner", "rice", "soup", "sandwich", "mezze"),
    "fresh_produce": ("produce", "fruit", "vegetable", "salad"),
    "dairy": ("dairy", "milk", "cheese", "yogurt", "yoghurt", "labneh"),
    "drinks": ("drink", "juice", "coffee", "beverage"),
    "desserts": ("dessert", "sweet", "cake", "baklava", "knefeh", "chocolate"),
    "snacks": ("snack", "nuts", "granola", "chips"),
}

NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "twelve": 12,
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


def infer_servings(title, description):
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
            candidates.append({**listing, "business_id": business["business_id"], "business_name": business["business_name"], "delivery_fee": business["delivery_fee"]})
    if optimization_mode == "lowest_price":
        return sorted(candidates, key=lambda item: (item["price"], -listing_match_score(item, meal_purpose, preferences)))
    return sorted(candidates, key=lambda item: (-listing_match_score(item, meal_purpose, preferences), item["price"]))


def build_reliable_basket(businesses, budget, target_servings, people, meal_purpose="", preferences="", optimization_mode="best_match", locked_listing_ids=None):
    candidates = flatten_candidates(businesses, meal_purpose, preferences, optimization_mode)
    chosen, used_businesses = [], set()
    food_total = delivery_total = 0.0
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
            chosen.append({"listing_id": candidate["listing_id"], "title": candidate["title"], "quantity": 1, "business_id": candidate["business_id"], "business_name": candidate["business_name"]})
        food_total += candidate["price"]
        delivery_total += extra_delivery
        used_businesses.add(candidate["business_id"])
        portions += candidate.get("servings_per_unit", 1)
        return True

    for listing_id in locked_listing_ids or []:
        locked = next((item for item in candidates if item["listing_id"] == listing_id), None)
        if locked:
            add_one(locked)
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
    return {"items": chosen, "reason": "Matched to your meal purpose and preferences across the closest available businesses."}


def basket_match_score(basket, businesses, meal_purpose, preferences):
    catalog = {item["listing_id"]: item for item in flatten_candidates(businesses, meal_purpose, preferences)}
    score = 0
    for selected in basket.get("items", []):
        listing = catalog.get(selected.get("listing_id"))
        if not listing:
            return -1000
        score += listing_match_score(listing, meal_purpose, preferences)
    return score
