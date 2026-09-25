import api from "./api";

export interface CommissionSetting {
  commission_rate_bps: number;
  commission_percent: number;
}

export interface CommissionUpdateResponse
  extends CommissionSetting {
  message: string;
}

export async function getCommissionSetting(): Promise<
  CommissionSetting
> {
  const response = await api.get<CommissionSetting>(
    "/admin/settings/commission"
  );

  return response.data;
}

export async function updateCommissionSetting(
  commissionPercent: number
): Promise<CommissionUpdateResponse> {
  const commissionRateBps = Math.round(
    commissionPercent * 100
  );

  const response = await api.patch<CommissionUpdateResponse>(
    "/admin/settings/commission",
    {
      commission_rate_bps: commissionRateBps,
    }
  );

  return response.data;
}