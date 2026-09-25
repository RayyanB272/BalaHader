from pydantic import BaseModel, Field
from typing import Literal, Optional


class SellerInsightsRequest(BaseModel):
    days: int = 30


class SmartBasketRequest(BaseModel):
    budget: float = Field(gt=0)
    currency: str = "USD"
    people: int = Field(gt=0)
    meals: int = Field(default=1, gt=0, le=7)
    meal_purpose: str
    preferences: Optional[str] = None
    area_code: Optional[str] = None
    fulfillment_type: Literal["pickup", "delivery"]
