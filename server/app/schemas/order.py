from pydantic import BaseModel, Field
from typing import Literal, List, Optional


class OrderItemCreate(BaseModel):
    listing_id: str
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]

    fulfillment_type: Literal[
        "pickup",
        "delivery"
    ]

    delivery_area_id: Optional[str] = None
    delivery_address: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: Literal[
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "completed",
        "cancelled"
    ]