import api from "./api";

export type FulfillmentType = "pickup" | "delivery";

export interface SmartBasketRequest {
  budget: number;
  currency: string;
  people: number;
  meals: number;
  meal_purpose: string;
  preferences?: string;
  excluded_listing_ids?: string[];
  optimization_mode?: "best_match" | "lowest_price" | "most_variety";
  locked_listing_ids?: string[];
  area_code?: string;
  fulfillment_type: FulfillmentType;
}

export interface SmartBasketItem {
  listing_id: string;
  title: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  business_id: string;
  business_name: string;
  servings_per_unit?: number;
  match_reason?: string;
}

export interface SmartBasketResponse {
  business_id: string;
  business_name: string;
  business_count?: number;
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
  preference_note?: string;
  businesses?: Array<{ business_id: string; business_name: string; delivery_fee: number }>;
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
