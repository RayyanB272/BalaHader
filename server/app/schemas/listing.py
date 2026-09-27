from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime


class ListingCreate(BaseModel):
    title: str
    description: Optional[str] = None

    category: Literal[
        "bakery",
        "prepared_meals",
        "fresh_produce",
        "dairy",
        "drinks",
        "desserts",
        "snacks",
        "other"
    ]

    original_price: float = Field(gt=0)
    discounted_price: float = Field(gt=0)

    quantity: int = Field(gt=0)

    sale_deadline: datetime
    pickup_deadline: datetime

    fulfillment_type: Literal[
        "pickup",
        "delivery",
        "both"
    ]

    donate_if_unsold: bool = True
    donation_eligible: bool = True

    image_url: str = Field(min_length=1)
    servings_per_package: int = Field(default=1, gt=0, le=100)
    package_contents: Optional[str] = None
    dietary_tags: List[Literal["vegetarian", "vegan", "dairy_free", "gluten_free", "halal"]] = Field(default_factory=list)
    allergens: List[str] = Field(default_factory=list)
    suitable_meals: List[Literal["breakfast", "lunch", "dinner", "snacks", "gathering"]] = Field(default_factory=list)

class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

    category: Optional[
        Literal[
            "bakery",
            "prepared_meals",
            "fresh_produce",
            "dairy",
            "drinks",
            "desserts",
            "snacks",
            "other"
        ]
    ] = None

    original_price: Optional[float] = Field(
        default=None,
        gt=0
    )

    discounted_price: Optional[float] = Field(
        default=None,
        gt=0
    )

    quantity: Optional[int] = Field(
        default=None,
        gt=0
    )

    sale_deadline: Optional[datetime] = None
    pickup_deadline: Optional[datetime] = None

    fulfillment_type: Optional[
        Literal[
            "pickup",
            "delivery",
            "both"
        ]
    ] = None

    donate_if_unsold: Optional[bool] = None
    donation_eligible: Optional[bool] = None
    image_url: Optional[str] = None
    servings_per_package: Optional[int] = Field(default=None, gt=0, le=100)
    package_contents: Optional[str] = None
    dietary_tags: Optional[List[str]] = None
    allergens: Optional[List[str]] = None
    suitable_meals: Optional[List[str]] = None


class ListingDisable(BaseModel):
    reason: str = Field(
        min_length=3,
        max_length=500
    )
