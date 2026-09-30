import api from "./api";

export interface FoodImageUploadResponse {
  message: string;
  image_url: string;
  file_id: string;
}

export async function uploadFoodImage(
  file: File
): Promise<FoodImageUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<FoodImageUploadResponse>(
    "/uploads/food-image",
    formData,
    {
      // Override the JSON default used by the shared API client. Axios adds
      // the multipart boundary automatically in the browser.
      headers: { "Content-Type": "multipart/form-data" },
    }
  );

  return response.data;
}

export async function uploadVerificationDocument(
  file: File
): Promise<FoodImageUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<FoodImageUploadResponse>(
    "/uploads/verification-document",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return response.data;
}
