from pydantic import BaseModel
from typing import Optional


class BusinessCreate(BaseModel):
    business_name: str
    business_type: str
    description: Optional[str] = None
    phone: str
    address: str
    area: str
    pickup_info: Optional[str] = None
    delivery_enabled: bool = False


class BusinessUpdate(BaseModel):
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None