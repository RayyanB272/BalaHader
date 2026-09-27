from pydantic import BaseModel, Field
from typing import List, Literal, Optional


class SellerInsightsRequest(BaseModel):
    days: int = 30


class SmartBasketRequest(BaseModel):
    budget: float = Field(gt=0)
    currency: str = "USD"
    people: int = Field(gt=0)
    meals: int = Field(default=1, gt=0, le=7)
    meal_purpose: str
    preferences: Optional[str] = None
    excluded_listing_ids: List[str] = Field(default_factory=list)
    locked_listing_ids: List[str] = Field(default_factory=list)
    optimization_mode: Literal["best_match", "lowest_price", "most_variety"] = "best_match"
    area_code: Optional[str] = None
    fulfillment_type: Literal["pickup", "delivery"]
