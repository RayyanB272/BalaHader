from pydantic import BaseModel, Field


class DeliveryAreaCreate(BaseModel):
    area_code: str
    area_name: str
    delivery_fee: float = Field(ge=0)
    estimated_time_minutes: int = Field(gt=0)