import api from "./api";

export interface Review {
  _id: string;
  rating: number;
  comment?: string;
  reviewer_name: string;
  created_at: string;
  target_type?: "listing" | "donation";
  target_id?: string;
  target_title?: string;
  business_name?: string;
}

export async function getBusinessReviews(): Promise<Review[]> {
  return (await api.get<Review[]>("/reviews/business")).data;
}

export async function getAdminReviews(): Promise<Review[]> {
  return (await api.get<Review[]>("/reviews/admin")).data;
}

export interface ListingReviews {
  average_rating: number;
  review_count: number;
  reviews: Review[];
}

export async function getListingReviews(listingId: string): Promise<ListingReviews> {
  return (await api.get<ListingReviews>(`/reviews/listings/${listingId}`)).data;
}

export async function getMyReview(
  target: "listing" | "donation",
  targetId: string
): Promise<Review | null> {
  return (await api.get<Review | null>(`/reviews/mine/${target}/${targetId}`)).data;
}

export async function reviewListing(listingId: string, rating: number, comment: string): Promise<Review> {
  return (await api.post<Review>(`/reviews/listings/${listingId}`, { rating, comment })).data;
}

export async function reviewDonation(donationId: string, rating: number, comment: string): Promise<Review> {
  return (await api.post<Review>(`/reviews/donations/${donationId}`, { rating, comment })).data;
}
