from pydantic import BaseModel, Field


class PaymentIntentRequest(BaseModel):
    order_id: str


class BatchPaymentIntentRequest(BaseModel):
    order_ids: list[str] = Field(min_length=1)
