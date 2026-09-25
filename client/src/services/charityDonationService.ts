import api from "./api";

export type CharityDonationStatus =
  | "available"
  | "claimed"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

export interface CharityDonation {
  _id: string;
  listing_id: string;
  business_id: string;
  charity_id?: string | null;
  title: string;
  category?: string;
  image_url?: string;
  quantity: number;
  status: CharityDonationStatus;
  pickup_deadline?: string;
  auto_generated: boolean;
  available_at?: string;
  claimed_at?: string | null;
  collected_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export async function getAvailableDonations(): Promise<
  CharityDonation[]
> {
  const response = await api.get<CharityDonation[]>(
    "/donations/available"
  );

  return response.data;
}

export async function getMyClaimedDonations(): Promise<
  CharityDonation[]
> {
  const response = await api.get<CharityDonation[]>(
    "/donations/my-claimed"
  );

  return response.data;
}

export async function claimDonation(
  donationId: string
): Promise<{ message: string }> {
  const response = await api.post(
    `/donations/${donationId}/claim`
  );

  return response.data;
}

export async function collectDonation(
  donationId: string
): Promise<{ message: string }> {
  const response = await api.patch(
    `/donations/${donationId}/collect`
  );

  return response.data;
}

export async function getCharityOrders(): Promise<CharityDonation[]> {
  const response = await api.get<CharityDonation[]>(
    "/donations/charity-orders"
  );
  return response.data;
}
