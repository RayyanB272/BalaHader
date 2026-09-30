from app.routes.ai import build_fallback_seller_insight
from app.services.smart_basket_builder import build_reliable_basket, infer_servings


def test_servings_are_inferred_from_listing_title():
    assert infer_servings("Cake slices (4)", "") == 4


def test_reliable_basket_respects_budget_and_single_person_quantity():
    businesses = [{
        "business_id": "b1", "business_name": "Bakery", "delivery_fee": 0,
        "listings": [{"listing_id": "l1", "title": "Bread (4)", "category": "bakery", "price": 4.0, "available_quantity": 5, "servings_per_unit": 4, "dietary_tags": [], "suitable_meals": ["breakfast"]}],
    }]
    basket = build_reliable_basket(businesses, budget=10, target_servings=3, people=1, meal_purpose="breakfast")
    assert basket["items"] == [{"listing_id": "l1", "title": "Bread (4)", "quantity": 1, "business_id": "b1", "business_name": "Bakery"}]


def test_seller_insight_fallback_uses_real_statistics():
    text = build_fallback_seller_insight([{"title": "Bread", "total_offered": 10, "total_sold": 8, "total_unsold": 2}], 30)
    assert "80.0%" in text
    assert "Bread" in text
