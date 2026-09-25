import api from "./api";

export interface Review {
  _id: string;
  rating: number;
  comment?: string;
  reviewer_name: string;
  created_at: string;
}

export interface ListingReviews {
  average_rating: number;
  review_count: number;
  reviews: Review[];
}

export async function getListingReviews(listingId: string): Promise<ListingReviews> {
  return (await api.get<ListingReviews>(`/reviews/listings/${listingId}`)).data;
}

export async function reviewListing(listingId: string, rating: number, comment: string) {
  return (await api.post(`/reviews/listings/${listingId}`, { rating, comment })).data;
}

export async function reviewDonation(donationId: string, rating: number, comment: string) {
  return (await api.post(`/reviews/donations/${donationId}`, { rating, comment })).data;
}
