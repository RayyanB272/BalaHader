import api from "./api";

export type BusinessOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export interface BusinessOrderItem {
  listing_id: string;
  title?: string;
  quantity: number;
  unit_price?: number;
  subtotal?: number;
}

export interface BusinessOrder {
  _id: string;
  customer_id: string;
  items: BusinessOrderItem[];
  fulfillment_type: "pickup" | "delivery";
  delivery_address?: string;
  order_status: BusinessOrderStatus;
  payment_status: string;
  subtotal?: number;
  delivery_fee?: number;
  total_amount?: number;
  business_earnings?: number;
  created_at: string;
}

export async function getBusinessOrders(): Promise<BusinessOrder[]> {
  const response = await api.get<BusinessOrder[]>("/orders/business");
  return response.data;
}

export async function getBusinessOrder(
  orderId: string
): Promise<BusinessOrder> {
  const response = await api.get<BusinessOrder>(
    `/orders/business/${orderId}`
  );

  return response.data;
}

export async function updateBusinessOrderStatus(
  orderId: string,
  status: BusinessOrderStatus
): Promise<{ message: string; status: BusinessOrderStatus }> {
  const response = await api.patch(
    `/orders/business/${orderId}/status`,
    { status }
  );

  return response.data;
}