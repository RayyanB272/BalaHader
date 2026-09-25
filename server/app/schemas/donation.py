from pydantic import BaseModel
from typing import Optional


class DonationCreate(BaseModel):
    listing_id: str
    quantity: int


class DonationStatusUpdate(BaseModel):
    status: str