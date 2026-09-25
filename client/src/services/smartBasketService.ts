import api from "./api";

export type FulfillmentType = "pickup" | "delivery";

export interface SmartBasketRequest {
  budget: number;
  currency: string;
  people: number;
  meals: number;
  meal_purpose: string;
  preferences?: string;
  area_code?: string;
  fulfillment_type: FulfillmentType;
}

export interface SmartBasketItem {
  listing_id: string;
  title: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface SmartBasketResponse {
  business_id: string;
  business_name: string;
  items: SmartBasketItem[];
  food_total: number;
  delivery_fee: number;
  total: number;
  budget: number;
  people: number;
  meals: number;
  servings: number;
  currency: string;
  reason?: string;
  stock_reserved: boolean;
  order_created: boolean;
}

export async function generateSmartBasket(
  request: SmartBasketRequest
): Promise<SmartBasketResponse> {
  const response = await api.post<SmartBasketResponse>(
    "/ai/smart-basket",
    request
  );

  return response.data;
}
