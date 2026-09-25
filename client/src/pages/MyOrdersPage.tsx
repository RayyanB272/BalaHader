import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageFrame from "../components/layout/PageFrame";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import {
  dashboardService,
  type OrderSummary,
} from "../services/dashboardService";
import ReviewForm from "../components/ReviewForm";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadOrders() {
    setLoading(true);
    setError(false);

    try {
      setOrders(await dashboardService.getCustomerOrders());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  return (
    <PageFrame>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-[#3A2925]">
          My orders
        </h1>
        <p className="mt-2 text-sm text-[#71605A]">
          Track your BalaHader purchases and payments.
        </p>

        <div className="mt-8">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorState
              message="Could not load your orders."
              onRetry={() => void loadOrders()}
            />
          ) : orders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Your orders will appear here after you place one."
            />
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <article
                  key={order._id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm"
                >
                  <div>
                    <h2 className="font-semibold text-[#3A2925]">
                      Order #{order._id.slice(-8).toUpperCase()}
                    </h2>
                    <p className="mt-1 text-sm capitalize text-[#71605A]">
                      Order: {order.order_status.replaceAll("_", " ")}
                      {" · "}
                      Payment: {order.payment_status.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="w-full sm:w-auto"><p className="font-bold text-[#C9472E]">
                    ${order.total_amount.toFixed(2)}
                  </p></div>
                  {order.order_status === "completed" && order.items?.map((item) => (
                    <div key={item.listing_id} className="w-full border-t border-[#EEDFD3] pt-3">
                      <p className="text-sm font-semibold text-[#3A2925]">Review {item.title}</p>
                      <ReviewForm target="listing" targetId={item.listing_id} />
                    </div>
                  ))}
                </article>
              ))}
            </div>
          )}
        </div>

        <Link
          to="/browse"
          className="mt-8 inline-block text-sm font-semibold text-[#C9472E]"
        >
          ← Browse more food
        </Link>
      </main>

      </PageFrame>
  );
}
