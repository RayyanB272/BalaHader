import api from "./api";

export type ListingCategory =
  | "bakery"
  | "prepared_meals"
  | "fresh_produce"
  | "dairy"
  | "drinks"
  | "desserts"
  | "snacks"
  | "other";

export type FulfillmentType =
  | "pickup"
  | "delivery"
  | "both";

export interface BusinessListing {
  _id: string;
  title: string;
  description?: string;
  category: ListingCategory;
  original_price: number;
  discounted_price: number;
  original_quantity: number;
  remaining_quantity: number;
  reserved_quantity: number;
  quantity_sold: number;
  sale_deadline: string;
  pickup_deadline: string;
  fulfillment_type: FulfillmentType;
  donate_if_unsold: boolean;
  donation_eligible: boolean;
  image_url?: string;
  status: string;
  disabled_reason?: string;
  disabled_at?: string;
  updated_at?: string;
}

export interface CreateListingData {
  title: string;
  description?: string;
  category: ListingCategory;
  original_price: number;
  discounted_price: number;
  quantity: number;
  sale_deadline: string;
  pickup_deadline: string;
  fulfillment_type: FulfillmentType;
  donate_if_unsold: boolean;
  donation_eligible: boolean;
  image_url?: string;
}

export type UpdateListingData = Partial<
  CreateListingData
>;

export async function getBusinessListings(): Promise<BusinessListing[]> {
  const response = await api.get<BusinessListing[]>(
    "/listings/my-listings"
  );

  return response.data;
}

export async function createBusinessListing(
  data: CreateListingData
): Promise<{ listing_id: string }> {
  const response = await api.post("/listings/", data);
  return response.data;
}

export async function updateBusinessListing(
  listingId: string,
  data: UpdateListingData
): Promise<BusinessListing> {
  const response = await api.patch<BusinessListing>(
    `/listings/${listingId}`,
    data
  );

  return response.data;
}

export async function disableBusinessListing(
  listingId: string,
  reason: string
): Promise<{
  message: string;
  status: "disabled";
  reason: string;
}> {
  const response = await api.patch(
    `/listings/${listingId}/disable`,
    {
      reason: reason.trim(),
    }
  );

  return response.data;
}