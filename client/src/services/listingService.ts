import api from "./api";

export interface Listing {
  _id: string;
  title: string;
  description?: string;
  category: string;
  original_price: number;
  discounted_price: number;
  available_quantity: number;
  image_url?: string;
  sale_deadline?: string;
  pickup_deadline?: string;
  fulfillment_type?: "pickup" | "delivery" | "both";
  average_rating?: number;
  review_count?: number;
  business: {
    business_id: string;
    business_name: string;
    area?: string;
  };
}

export interface ListingDetail
  extends Omit<Listing, "business" | "available_quantity"> {
  remaining_quantity: number;
  reserved_quantity?: number;
  pickup_deadline?: string;
  sale_deadline?: string;
  business?: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    area?: string;
    delivery_enabled?: boolean;
  };
}

export async function getListings(
  search = "",
  category = "",
  maxPrice = ""
): Promise<Listing[]> {
  const response = await api.get<Listing[]>("/listings/", {
    params: {
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(category ? { category } : {}),
      ...(maxPrice ? { max_price: Number(maxPrice) } : {}),
    },
  });

  return response.data;
}

export async function getListing(id: string): Promise<ListingDetail> {
  const response = await api.get<ListingDetail>(`/listings/${id}`);
  return response.data;
}
