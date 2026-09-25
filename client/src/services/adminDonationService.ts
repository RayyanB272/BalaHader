import api from "./api";

export interface AdminDonation {
  _id: string;
  listing_id: string;
  business_id: string;
  charity_id?: string | null;
  title: string;
  category?: string;
  quantity: number;
  status: string;
  pickup_deadline?: string;
  auto_generated?: boolean;
  available_at?: string;
  claimed_at?: string | null;
  collected_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export async function getAdminDonations(): Promise<
  AdminDonation[]
> {
  const response = await api.get<AdminDonation[]>(
    "/admin/donations"
  );

  return response.data;
}