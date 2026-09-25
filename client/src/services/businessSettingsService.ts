import api from "./api";

export interface BusinessProfile {
  _id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  description?: string;
  phone: string;
  address: string;
  area: string;
  delivery_enabled: boolean;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface DeliveryArea {
  _id: string;
  business_id: string;
  country_code: string;
  city_code: string;
  area_code: string;
  area_name: string;
  delivery_fee: number;
  estimated_time_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateDeliveryAreaData {
  area_code: string;
  area_name: string;
  delivery_fee: number;
  estimated_time_minutes: number;
}

export async function getBusinessProfile(): Promise<
  BusinessProfile
> {
  const response = await api.get<BusinessProfile>(
    "/businesses/me"
  );

  return response.data;
}

export interface UpdateBusinessProfileData {
  business_name: string;
  business_type: string;
  description?: string;
  phone: string;
  address: string;
  area: string;
}

export async function updateBusinessProfile(
  data: UpdateBusinessProfileData
): Promise<BusinessProfile> {
  const response = await api.patch<BusinessProfile>(
    "/businesses/profile",
    {
      ...data,
      business_name: data.business_name.trim(),
      business_type: data.business_type.trim(),
      description: data.description?.trim() || null,
      phone: data.phone.trim(),
      address: data.address.trim(),
      area: data.area.trim(),
    }
  );

  return response.data;
}

export async function getBusinessDeliveryAreas(): Promise<
  DeliveryArea[]
> {
  const response = await api.get<DeliveryArea[]>(
    "/businesses/delivery-areas"
  );

  return response.data;
}

export async function createBusinessDeliveryArea(
  data: CreateDeliveryAreaData
): Promise<{
  message: string;
  delivery_area_id: string;
}> {
  const response = await api.post(
    "/businesses/delivery-areas",
    {
      ...data,
      area_code: data.area_code.trim().toUpperCase(),
      area_name: data.area_name.trim(),
    }
  );

  return response.data;
}