import api from "./api";

export interface ProfileFormData {
  name: string;
  phone: string;
  address: string;
  area: string;
  businessType?: string;
}

export async function createRoleProfile(role: "business" | "charity", data: ProfileFormData): Promise<void> {
  if (role === "business") {
    await api.post("/businesses/profile", {
      business_name: data.name,
      business_type: data.businessType,
      phone: data.phone,
      address: data.address,
      area: data.area,
    });
  } else {
    await api.post("/charities/profile", {
      organization_name: data.name,
      phone: data.phone,
      address: data.address,
      area: data.area,
    });
  }
}
