import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "./api";
import { getAdminUsers } from "./adminUserService";
import { getBusinessOrders } from "./businessOrderService";
import { getMyClaimedDonations } from "./charityDonationService";
import { createCombinedPaymentIntent, getOrder } from "./orderService";


vi.mock("./api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));


describe("dashboard workflow services", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads customer order details", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { _id: "order-1" } });
    await getOrder("order-1");
    expect(api.get).toHaveBeenCalledWith("/orders/my-orders/order-1");
  });

  it("creates one payment for a combined checkout", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { client_secret: "secret" } });
    await createCombinedPaymentIntent(["one", "two"]);
    expect(api.post).toHaveBeenCalledWith("/payments/create-batch-intent", { order_ids: ["one", "two"] });
  });

  it("loads business, charity, and admin dashboard data", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    await getBusinessOrders();
    await getMyClaimedDonations();
    await getAdminUsers();
    expect(api.get).toHaveBeenCalledWith("/orders/business");
    expect(api.get).toHaveBeenCalledWith("/donations/my-claimed");
    expect(api.get).toHaveBeenCalledWith("/admin/users");
  });
});
