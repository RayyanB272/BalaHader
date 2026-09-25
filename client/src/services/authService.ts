import api from "./api";

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
  role: "customer" | "business" | "charity";
}

export interface ForgotPasswordResponse {
  message: string;
  reset_url?: string;
}

export interface ResetPasswordData {
  token: string;
  new_password: string;
}

export const login = async (data: LoginData) => {
  const response = await api.post("/auth/login", data);
  return response.data;
};

export const register = async (data: RegisterData) => {
  const response = await api.post("/auth/register", data);
  return response.data;
};

export const requestPasswordReset = async (
  email: string
): Promise<ForgotPasswordResponse> => {
  const response = await api.post<ForgotPasswordResponse>(
    "/auth/forgot-password",
    {
      email: email.trim().toLowerCase(),
    }
  );

  return response.data;
};

export const resetPassword = async (
  data: ResetPasswordData
): Promise<{ message: string }> => {
  const response = await api.post(
    "/auth/reset-password",
    data
  );

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/users/me");
  return response.data;
};

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } finally {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
  }
};

export interface BusinessProfileInput {
  business_name: string;
  business_type: string;
  description?: string;
  phone: string;
  address: string;
  area: string;
  delivery_enabled: boolean;
  pickup_info?: string;
}

export interface CharityProfileInput {
  organization_name: string;
  description?: string;
  phone: string;
  address: string;
  area: string;
  verification_document_url: string;
}

export const createBusinessProfile = async (data: BusinessProfileInput) => {
  const response = await api.post("/businesses/profile", data);
  return response.data;
};

export const createCharityProfile = async (data: CharityProfileInput) => {
  const response = await api.post("/charities/profile", data);
  return response.data;
};
