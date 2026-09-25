import api from "./api";

export type CharityVerificationStatus =
  | "pending"
  | "verified"
  | "rejected";

export interface CharityProfile {
  _id: string;
  user_id: string;
  organization_name: string;
  description?: string;
  phone: string;
  address: string;
  area: string;
  verification_document_url?: string;
  verification_status: CharityVerificationStatus;
  verification_reason?: string;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface UpdateCharityProfileData {
  organization_name: string;
  description?: string;
  phone: string;
  address: string;
  area: string;
  verification_document_url?: string;
}

export async function getCharityProfile(): Promise<
  CharityProfile
> {
  const response = await api.get<CharityProfile>(
    "/charities/me"
  );

  return response.data;
}

export async function updateCharityProfile(
  data: UpdateCharityProfileData
): Promise<CharityProfile> {
  const response = await api.patch<CharityProfile>(
    "/charities/profile",
    {
      organization_name: data.organization_name.trim(),
      description: data.description?.trim() || null,
      phone: data.phone.trim(),
      address: data.address.trim(),
      area: data.area.trim(),
      verification_document_url:
        data.verification_document_url?.trim() || null,
    }
  );

  return response.data;
}