from pydantic import BaseModel


class PaymentIntentRequest(BaseModel):
    order_id: str