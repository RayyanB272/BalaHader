import { generateSellerInsights, type SellerInsightsResponse } from "./sellerInsightsService";
import axios from "axios";

export interface SellerInsightsState {
  days: string;
  result: SellerInsightsResponse | null;
  loading: boolean;
  error: string;
}

const STORAGE_KEY = "balahader_seller_insights";
const listeners = new Set<() => void>();

function restore(): SellerInsightsState {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.result) return { days: String(saved.days || 30), result: saved.result, loading: false, error: "" };
  } catch { /* Ignore invalid cached data. */ }
  return { days: "30", result: null, loading: false, error: "" };
}

let state = restore();

function publish(next: SellerInsightsState) {
  state = next;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ days: state.days, result: state.result }));
  listeners.forEach((listener) => listener());
}

export const sellerInsightsStore = {
  getSnapshot: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setDays(days: string) { publish({ ...state, days }); },
  setError(error: string) { publish({ ...state, error }); },
  async analyze(days: number) {
    if (state.loading) return;
    publish({ ...state, loading: true, error: "" });
    try {
      const result = await generateSellerInsights(days);
      publish({ days: String(days), result, loading: false, error: "" });
    } catch (cause: unknown) {
      const detail = axios.isAxiosError(cause) ? cause.response?.data?.detail : null;
      publish({ ...state, loading: false, error: typeof detail === "string" ? detail : "Seller insights could not be generated." });
    }
  },
};
