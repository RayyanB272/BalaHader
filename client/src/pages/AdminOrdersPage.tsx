import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import {
  getAdminOrders,
  reconcileAdminOrder,
  refundAdminOrder,
  type AdminOrder,
  type ReconciliationAction,
} from "../services/adminOrderService";

function formatValue(value: string) {
  return value.replaceAll("_", " ");
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [search, setSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setLoadError(false);

    try {
      setOrders(await getAdminOrders());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  const orderStatuses = useMemo(
    () =>
      Array.from(
        new Set(orders.map((order) => order.order_status))
      ),
    [orders]
  );

  const paymentStatuses = useMemo(
    () =>
      Array.from(
        new Set(orders.map((order) => order.payment_status))
      ),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesOrderStatus =
        orderStatus === "all" ||
        order.order_status === orderStatus;

      const matchesPaymentStatus =
        paymentStatus === "all" ||
        order.payment_status === paymentStatus;

      const matchesSearch =
        !normalizedSearch ||
        order._id.toLowerCase().includes(normalizedSearch) ||
        order.customer_id
          .toLowerCase()
          .includes(normalizedSearch) ||
        order.business_id
          .toLowerCase()
          .includes(normalizedSearch);

      return (
        matchesOrderStatus &&
        matchesPaymentStatus &&
        matchesSearch
      );
    });
  }, [orders, search, orderStatus, paymentStatus]);

  function getErrorMessage(
    error: unknown,
    fallback: string
  ) {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;

      if (typeof detail === "string") {
        return detail;
      }
    }

    return fallback;
  }

  async function handleReconciliation(
    order: AdminOrder,
    action: ReconciliationAction
  ) {
    const reason = reasons[order._id]?.trim() ?? "";

    if (reason.length < 3) {
      setActionError(
        "Enter a reason containing at least 3 characters."
      );
      return;
    }

    setUpdatingId(order._id);
    setActionError("");

    try {
      const result = await reconcileAdminOrder(
        order._id,
        action,
        reason
      );

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder._id === order._id
            ? {
                ...currentOrder,
                order_status:
                  action === "approve"
                    ? "confirmed"
                    : "cancelled",
                payment_status:
                  action === "approve"
                    ? "paid"
                    : "refund_pending",
                reconciliation_status:
                  action === "approve"
                    ? "approved"
                    : "refund_requested",
                reconciliation_reason: reason,
              }
            : currentOrder
        )
      );

      setActionError("");
      console.info(result.message);
    } catch (error) {
      setActionError(
        getErrorMessage(
          error,
          "The reconciliation could not be completed."
        )
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRefund(order: AdminOrder) {
    const confirmed = window.confirm(
      `Refund order #${order._id.slice(-8).toUpperCase()} through Stripe?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingId(order._id);
    setActionError("");

    try {
      await refundAdminOrder(order._id);

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder._id === order._id
            ? {
                ...currentOrder,
                payment_status: "refunded",
                order_status: "cancelled",
                reconciliation_status: "refunded",
              }
            : currentOrder
        )
      );
    } catch (error) {
      setActionError(
        getErrorMessage(
          error,
          "The Stripe refund could not be completed."
        )
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <DashboardShell
      role="admin"
      title="Order management"
      description="Review platform orders, payment states, reconciliation cases, and refunds."
    >
      <section className="grid gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4 lg:grid-cols-[1fr_220px_220px]">
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search by order, customer, or business ID..."
          aria-label="Search orders"
          className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"
        />

        <select
          value={orderStatus}
          onChange={(event) =>
            setOrderStatus(event.target.value)
          }
          aria-label="Filter by order status"
          className="w-full rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm capitalize outline-none focus:border-[#E85D3F]"
        >
          <option value="all">All order statuses</option>

          {orderStatuses.map((status) => (
            <option key={status} value={status}>
              {formatValue(status)}
            </option>
          ))}
        </select>

        <select
          value={paymentStatus}
          onChange={(event) =>
            setPaymentStatus(event.target.value)
          }
          aria-label="Filter by payment status"
          className="w-full rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm capitalize outline-none focus:border-[#E85D3F]"
        >
          <option value="all">All payment statuses</option>

          {paymentStatuses.map((status) => (
            <option key={status} value={status}>
              {formatValue(status)}
            </option>
          ))}
        </select>
      </section>

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : loadError ? (
        <ErrorState
          message="We couldn't load the platform orders."
          onRetry={() => void loadOrders()}
        />
      ) : orders.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title="No orders found"
            description="Customer orders will appear here."
          />
        </section>
      ) : filteredOrders.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title="No matching orders"
            description="Change your search or status filters."
          />
        </section>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const requiresReconciliation =
              order.order_status ===
              "reconciliation_required";

            const canRefund = [
              "refund_pending",
              "paid_late",
            ].includes(order.payment_status);

            return (
              <article
                key={order._id}
                className="rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#C9472E]">
                      Order #{order._id.slice(-8).toUpperCase()}
                    </p>

                    <p className="mt-2 text-sm text-[#71605A]">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#FFF0E5] px-3 py-1 text-xs font-semibold capitalize text-[#C9472E]">
                      {formatValue(order.order_status)}
                    </span>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">
                      Payment: {formatValue(order.payment_status)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 border-y border-[#EEDFD3] py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-[#71605A]">Customer ID</p>
                    <p className="mt-1 break-all font-semibold">
                      {order.customer_id}
                    </p>
                  </div>

                  <div>
                    <p className="text-[#71605A]">Business ID</p>
                    <p className="mt-1 break-all font-semibold">
                      {order.business_id}
                    </p>
                  </div>

                  <div>
                    <p className="text-[#71605A]">Fulfillment</p>
                    <p className="mt-1 font-semibold capitalize">
                      {formatValue(order.fulfillment_type)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[#71605A]">Total</p>
                    <p className="mt-1 font-semibold">
                      {typeof order.total_amount === "number"
                        ? `$${order.total_amount.toFixed(2)}`
                        : "Unavailable"}
                    </p>
                  </div>
                </div>

                {requiresReconciliation && (
                  <div className="mt-5 rounded-2xl bg-amber-50 p-4">
                    <label
                      htmlFor={`reason-${order._id}`}
                      className="block text-sm font-semibold text-amber-900"
                    >
                      Reconciliation reason
                    </label>

                    <textarea
                      id={`reason-${order._id}`}
                      rows={3}
                      maxLength={500}
                      value={reasons[order._id] ?? ""}
                      onChange={(event) =>
                        setReasons((currentReasons) => ({
                          ...currentReasons,
                          [order._id]: event.target.value,
                        }))
                      }
                      placeholder="Explain the reconciliation decision."
                      className="mt-2 w-full resize-none rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-500"
                    />

                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        disabled={updatingId === order._id}
                        onClick={() =>
                          void handleReconciliation(
                            order,
                            "refund"
                          )
                        }
                        className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        Request refund
                      </button>

                      <button
                        type="button"
                        disabled={updatingId === order._id}
                        onClick={() =>
                          void handleReconciliation(
                            order,
                            "approve"
                          )
                        }
                        className="rounded-xl bg-[#E85D3F] px-4 py-3 text-sm font-semibold text-white hover:bg-[#C9472E] disabled:opacity-60"
                      >
                        Approve order
                      </button>
                    </div>
                  </div>
                )}

                {canRefund && (
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      disabled={updatingId === order._id}
                      onClick={() =>
                        void handleRefund(order)
                      }
                      className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {updatingId === order._id
                        ? "Processing..."
                        : "Process Stripe refund"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}