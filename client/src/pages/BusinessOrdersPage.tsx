import { useEffect, useMemo, useState } from "react";
import ExpandableCard from "../components/ui/ExpandableCard";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import {
  getBusinessOrders,
  updateBusinessOrderStatus,
  type BusinessOrder,
  type BusinessOrderStatus,
} from "../services/businessOrderService";

function getNextStatus(
  order: BusinessOrder
): BusinessOrderStatus | null {
  if (order.fulfillment_type === "pickup") {
    const pickupSteps: Partial<
      Record<BusinessOrderStatus, BusinessOrderStatus>
    > = {
      confirmed: "preparing",
      preparing: "ready",
      ready: "completed",
    };

    return pickupSteps[order.order_status] ?? null;
  }

  const deliverySteps: Partial<
    Record<BusinessOrderStatus, BusinessOrderStatus>
  > = {
    confirmed: "preparing",
    preparing: "out_for_delivery",
    out_for_delivery: "completed",
  };

  return deliverySteps[order.order_status] ?? null;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default function BusinessOrdersPage() {
  const [orders, setOrders] = useState<BusinessOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => (status === "all" || order.order_status === status) && (!query || order._id.toLowerCase().includes(query) || order.items.some((item) => (item.title ?? "").toLowerCase().includes(query))));
  }, [orders, search, status]);

  async function loadOrders() {
    setLoading(true);
    setError(false);

    try {
      setOrders(await getBusinessOrders());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function handleAdvance(order: BusinessOrder) {
    const nextStatus = getNextStatus(order);

    if (!nextStatus) {
      return;
    }

    setUpdatingId(order._id);
    setActionError("");

    try {
      await updateBusinessOrderStatus(order._id, nextStatus);

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder._id === order._id
            ? {
                ...currentOrder,
                order_status: nextStatus,
              }
            : currentOrder
        )
      );
    } catch {
      setActionError(
        "The order status could not be updated. Check that the order is paid."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <DashboardShell
      role="business"
      title="Customer orders"
      description="Prepare orders and update customers as their food becomes ready."
    >
      <section className="grid gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4 sm:grid-cols-[1fr_220px]">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders..." className="rounded-xl border border-[#EEDFD3] px-4 py-2.5 text-sm outline-none focus:border-[#E85D3F]" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-2.5 text-sm"><option value="all">All statuses</option><option value="pending_payment">Pending payment</option><option value="confirmed">Confirmed</option><option value="preparing">Preparing</option><option value="ready">Ready</option><option value="out_for_delivery">Out for delivery</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
      </section>
      {actionError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState
          message="We couldn't load your business orders."
          onRetry={() => void loadOrders()}
        />
      ) : filteredOrders.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title={orders.length ? "No matching orders" : "No customer orders yet"}
            description={orders.length ? "Try another search or status." : "New paid orders will appear here."}
          />
        </section>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const nextStatus = getNextStatus(order);
            const canAdvance =
              order.payment_status === "paid" && nextStatus !== null;

            return (
              <ExpandableCard
                key={order._id}
                header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#C9472E]">
                      Order #{order._id.slice(-8).toUpperCase()}
                    </p>

                    <p className="mt-2 text-sm text-[#71605A]">
                      {new Date(order.created_at).toLocaleString()} · {order.items.length} {order.items.length === 1 ? "item" : "items"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#FFF0E5] px-3 py-1 text-xs font-semibold capitalize text-[#C9472E]">
                      {formatStatus(order.order_status)}
                    </span>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">
                      Payment: {formatStatus(order.payment_status)}
                    </span>
                  </div>
                </div>
                }
                details={
<>
                <div className="space-y-3 pb-4">
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.listing_id}-${index}`}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-[#3A2925]">
                          {item.title || "Food item"}
                        </p>

                        <p className="text-[#71605A]">
                          Quantity: {item.quantity}
                        </p>
                      </div>

                      {typeof item.subtotal === "number" && (
                        <span className="font-semibold text-[#3A2925]">
                          ${item.subtotal.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <p className="capitalize text-[#71605A]">
                    Fulfillment:{" "}
                    <span className="font-semibold text-[#3A2925]">
                      {formatStatus(order.fulfillment_type)}
                    </span>
                  </p>

                  {order.delivery_address && (
                    <p className="text-[#71605A]">
                      Address:{" "}
                      <span className="font-semibold text-[#3A2925]">
                        {order.delivery_address}
                      </span>
                    </p>
                  )}
                </div>


</>
                }
              >
                <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {typeof order.total_amount === "number" && (
                      <p className="text-lg font-bold text-[#3A2925]">
                        Total: ${order.total_amount.toFixed(2)}
                      </p>
                    )}

                    {typeof order.business_earnings === "number" && (
                      <p className="text-sm text-[#71605A]">
                        Your earnings: $
                        {order.business_earnings.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {canAdvance && nextStatus && (
                    <button
                      type="button"
                      disabled={updatingId === order._id}
                      onClick={() => void handleAdvance(order)}
                      className="rounded-xl bg-[#E85D3F] px-5 py-3 text-sm font-semibold capitalize text-white transition-colors hover:bg-[#C9472E] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingId === order._id
                        ? "Updating..."
                        : `Mark as ${formatStatus(nextStatus)}`}
                    </button>
                  )}
                </div>
              </ExpandableCard>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
