import api from "./api";

export interface PendingCharity {
  _id: string;
  user_id: string;
  organization_name: string;
  description?: string;
  phone: string;
  address: string;
  area: string;
  verification_document_url?: string;
  verification_status: "pending";
  created_at: string;
  updated_at?: string;
}

export interface AdminCharityActionResponse {
  message: string;
  reason: string;
}

export async function getPendingCharities(): Promise<
  PendingCharity[]
> {
  const response = await api.get<PendingCharity[]>(
    "/admin/charities/pending"
  );

  return response.data;
}

export async function verifyCharity(
  charityId: string,
  reason: string
): Promise<AdminCharityActionResponse> {
  const response = await api.patch<AdminCharityActionResponse>(
    `/admin/charities/${charityId}/verify`,
    { reason }
  );

  return response.data;
}

export async function rejectCharity(
  charityId: string,
  reason: string
): Promise<AdminCharityActionResponse> {
  const response = await api.patch<AdminCharityActionResponse>(
    `/admin/charities/${charityId}/reject`,
    { reason }
  );

  return response.data;
}