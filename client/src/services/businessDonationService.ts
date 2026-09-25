import api from "./api";

export type BusinessDonationStatus =
  | "available"
  | "claimed"
  | "ready_for_pickup"
  | "collected"
  | "completed"
  | "cancelled";

export interface BusinessDonation {
  _id: string;
  listing_id: string;
  business_id: string;
  charity_id?: string | null;
  title: string;
  category?: string;
  image_url?: string;
  quantity: number;
  status: BusinessDonationStatus;
  pickup_deadline?: string;
  auto_generated: boolean;
  available_at?: string;
  claimed_at?: string | null;
  collected_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateDonationData {
  listing_id: string;
  quantity: number;
}

export async function getBusinessDonations(): Promise<
  BusinessDonation[]
> {
  const response = await api.get<BusinessDonation[]>(
    "/donations/business"
  );

  return response.data;
}

export async function createDonation(
  data: CreateDonationData
): Promise<{
  message: string;
  donation_id: string;
}> {
  const response = await api.post("/donations/", data);
  return response.data;
}

export async function markDonationReady(
  donationId: string
): Promise<{ message: string }> {
  const response = await api.patch(
    `/donations/${donationId}/ready`
  );

  return response.data;
}
