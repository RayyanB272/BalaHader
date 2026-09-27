import api from "./api";

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export interface OrderSummary {
  _id: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  created_at?: string;
  checkout_id?: string;
  fulfillment_type?: "pickup" | "delivery";
  delivery_address?: string;
  delivery_fee?: number;
  subtotal?: number;
  business_name?: string;
  items?: Array<{
    listing_id: string;
    title: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface BusinessSummary {
  total_listings: number;
  active_listings: number;
  total_orders: number;
  completed_orders: number;
  earnings: number;
  total_donations: number;
  completed_donations: number;
}

export interface AdminSummary {
  total_users: number;
  total_businesses: number;
  total_charities: number;
  verified_charities: number;
  pending_charities: number;
  total_listings: number;
  active_listings: number;
  total_orders: number;
  total_donations: number;
}

export interface CharityProfile {
  organization_name: string;
  verification_status: string;
  area?: string;
}

export interface DonationSummary {
  _id: string;
  status: string;
  created_at?: string;
}

export const dashboardService = {
  getProfile: async () => (await api.get<UserProfile>("/users/me")).data,
  getCustomerOrders: async () => (await api.get<OrderSummary[]>("/orders/my-orders")).data,
  getBusinessSummary: async () => (await api.get<BusinessSummary>("/businesses/dashboard/summary")).data,
  getCharityProfile: async () => (await api.get<CharityProfile>("/charities/me")).data,
  getCharityClaims: async () => (await api.get<DonationSummary[]>("/donations/my-claimed")).data,
  getAdminSummary: async () => (await api.get<AdminSummary>("/admin/dashboard")).data,
};
