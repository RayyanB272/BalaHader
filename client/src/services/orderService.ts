import api from "./api";

export interface CreateOrderItem {
  listing_id: string;
  quantity: number;
}

export interface CreateOrderData {
  items: CreateOrderItem[];
  fulfillment_type: "pickup" | "delivery";
  delivery_area_id?: string;
  delivery_address?: string;
}

export interface CreatedOrder {
  order_id: string;
  total_amount: number;
  payment_status: string;
  order_status: string;
}

export async function createOrder(
  data: CreateOrderData
): Promise<CreatedOrder> {
  const response = await api.post<CreatedOrder>("/orders/", data);
  return response.data;
}

export async function createPaymentIntent(orderId: string) {
  const response = await api.post("/payments/create-intent", {
    order_id: orderId,
  });

  return response.data;
}

export interface OrderStatus {
  _id: string;
  payment_status: string;
  order_status: string;
}

export async function getOrder(orderId: string): Promise<OrderStatus> {
  const response = await api.get<OrderStatus>(
    `/orders/my-orders/${orderId}`
  );
  return response.data;
}