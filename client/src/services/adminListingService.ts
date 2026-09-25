import api from "./api";

export interface AdminListing {
  _id: string;
  business_id: string;
  title: string;
  description?: string;
  category: string;
  original_price: number;
  discounted_price: number;
  total_quantity?: number;
  remaining_quantity: number;
  reserved_quantity?: number;
  quantity_sold?: number;
  fulfillment_type: "pickup" | "delivery" | "both";
  image_url?: string;
  status: string;
  sale_deadline?: string;
  pickup_deadline?: string;
  created_at: string;
  updated_at?: string;
  disabled_reason?: string;
  disabled_at?: string;
}

export async function getAdminListings(): Promise<
  AdminListing[]
> {
  const response = await api.get<AdminListing[]>(
    "/admin/listings"
  );

  return response.data;
}

export async function disableAdminListing(
  listingId: string,
  reason: string
): Promise<{
  message: string;
  reason: string;
}> {
  const response = await api.patch(
    `/admin/listings/${listingId}/disable`,
    { reason }
  );

  return response.data;
}