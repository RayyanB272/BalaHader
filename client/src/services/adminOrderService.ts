import api from "./api";

export interface AdminOrderItem {
  listing_id: string;
  title?: string;
  quantity: number;
  unit_price?: number;
  subtotal?: number;
}

export interface AdminOrder {
  _id: string;
  customer_id: string;
  business_id: string;
  items: AdminOrderItem[];
  fulfillment_type: "pickup" | "delivery";
  delivery_address?: string;
  order_status: string;
  payment_status: string;
  subtotal?: number;
  delivery_fee?: number;
  total_amount?: number;
  platform_commission?: number;
  business_earnings?: number;
  reconciliation_status?: string;
  reconciliation_reason?: string;
  created_at: string;
  updated_at?: string;
}

export type ReconciliationAction = "approve" | "refund";

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const response = await api.get<AdminOrder[]>("/admin/orders");
  return response.data;
}

export async function reconcileAdminOrder(
  orderId: string,
  action: ReconciliationAction,
  reason: string
): Promise<{
  message: string;
  status: string;
}> {
  const response = await api.patch(
    `/admin/orders/${orderId}/reconcile`,
    {
      action,
      reason,
    }
  );

  return response.data;
}

export async function refundAdminOrder(
  orderId: string
): Promise<{
  message: string;
  refund_id: string;
  payment_status: "refunded";
}> {
  const response = await api.post(
    `/admin/orders/${orderId}/refund`
  );

  return response.data;
}