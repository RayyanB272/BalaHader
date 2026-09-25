import api from "./api";

export type UserRole =
  | "customer"
  | "business"
  | "charity"
  | "admin";

export type UserStatus = "active" | "suspended";

export interface AdminUser {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at?: string;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await api.get<AdminUser[]>("/admin/users");
  return response.data;
}

export async function updateAdminUserStatus(
  userId: string,
  status: UserStatus
): Promise<{ message: string }> {
  const response = await api.patch(
    `/admin/users/${userId}/status`,
    null,
    {
      params: {
        status_value: status,
      },
    }
  );

  return response.data;
}