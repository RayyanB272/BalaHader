import api from "./api";

export interface AdminBusiness {
  _id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  phone: string;
  address: string;
  area: string;
  delivery_enabled?: boolean;
  user_status?: "active" | "suspended" | "unknown";
  created_at: string;
  updated_at?: string;
}

export async function getAdminBusinesses(): Promise<
  AdminBusiness[]
> {
  const response = await api.get<AdminBusiness[]>(
    "/admin/businesses"
  );

  return response.data;
}
