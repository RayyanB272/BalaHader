import api from "./api";

export interface SellerStatistic {
  title: string;
  category?: string;
  times_listed: number;
  total_offered: number;
  total_sold: number;
  total_unsold: number;
  unsold_rate: number;
}

export interface SellerInsightsResponse {
  date_range_days: number;
  sample_size: number;
  statistics: SellerStatistic[];
  ai_insight: string;
}

export async function generateSellerInsights(
  days: number
): Promise<SellerInsightsResponse> {
  const response = await api.post<SellerInsightsResponse>(
    "/ai/seller-insights",
    { days }
  );

  return response.data;
}