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

export interface CheckoutDeliveryArea {
  _id: string;
  area_code: string;
  area_name: string;
  delivery_fee: number;
  estimated_time_minutes?: number;
}

export async function getCheckoutDeliveryAreas(
  businessId: string
): Promise<CheckoutDeliveryArea[]> {
  const response = await api.get<CheckoutDeliveryArea[]>(
    `/businesses/${businessId}/delivery-areas`
  );
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

export async function createCombinedPaymentIntent(orderIds: string[]) {
  const response = await api.post("/payments/create-batch-intent", {
    order_ids: orderIds,
  });
  return response.data as {
    checkout_id: string;
    client_secret: string;
    amount: number;
    currency: string;
    order_count: number;
  };
}

export async function getCheckoutPayment(checkoutId: string): Promise<{
  checkout_id: string;
  order_ids: string[];
  payment_status: string;
  order_count: number;
}> {
  return (await api.get(`/payments/checkout/${checkoutId}`)).data;
}
