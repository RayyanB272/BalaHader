import { useEffect, useMemo, useState } from "react";
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
import { CalendarDays, ChevronDown, MapPin, PackageCheck, Store } from "lucide-react";

function progressSteps(fulfillment: string | undefined) {
  return fulfillment === "delivery" ? ["confirmed","preparing","out_for_delivery","completed"] : ["confirmed","preparing","ready","completed"];
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  function toggleOrder(orderId: string) {
    setExpandedOrders((current) => {
      const next = new Set(current);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }
  const groupedOrders = useMemo(() => {
    const groups = new Map<string, OrderSummary[]>();
    orders.forEach((order) => {
      const key = order.checkout_id || order._id;
      groups.set(key, [...(groups.get(key) || []), order]);
    });
    return [...groups.entries()].map(([id, businessOrders]) => ({ id, businessOrders }));
  }, [orders]);
  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groupedOrders.filter((group) => (status === "all" || group.businessOrders.some((order) => order.order_status === status)) && (!query || group.id.toLowerCase().includes(query) || group.businessOrders.some((order) => order.business_name?.toLowerCase().includes(query) || order.items?.some((item) => (item.title ?? "").toLowerCase().includes(query)))));
  }, [groupedOrders, search, status]);

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
        <section className="mt-6 grid gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4 sm:grid-cols-[1fr_220px]">
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders..." className="rounded-xl border border-[#EEDFD3] px-4 py-2.5 text-sm outline-none focus:border-[#E85D3F]" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-2.5 text-sm"><option value="all">All statuses</option><option value="pending_payment">Pending payment</option><option value="confirmed">Confirmed</option><option value="preparing">Preparing</option><option value="ready">Ready</option><option value="out_for_delivery">Out for delivery</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
        </section>

        <div className="mt-8">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorState
              message="Could not load your orders."
              onRetry={() => void loadOrders()}
            />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              title={orders.length ? "No matching orders" : "No orders yet"}
              description={orders.length ? "Try another search or status." : "Your orders will appear here after you place one."}
            />
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((group) => {
                const itemCount = group.businessOrders.reduce((sum, order) => sum + (order.items?.reduce((count, item) => count + item.quantity, 0) || 0), 0);
                const total = group.businessOrders.reduce((sum, order) => sum + order.total_amount, 0);
                const createdAt = group.businessOrders[0]?.created_at;
                const expanded = expandedOrders.has(group.id);
                return (
                <article
                  key={group.id}
                  className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm"
                >
                  <button type="button" onClick={() => toggleOrder(group.id)} aria-expanded={expanded} className="flex w-full flex-wrap items-center justify-between gap-4 bg-[#FFF9EE] px-5 py-4 text-left transition-colors hover:bg-[#FFF0E5]"><div><p className="text-xs font-semibold uppercase text-[#E85D3F]">{group.businessOrders.length > 1 ? "Combined order" : "Order"}</p><h2 className="mt-1 font-bold text-[#3A2925]">#{group.id.slice(-8).toUpperCase()}</h2><p className="mt-1 flex items-center gap-1.5 text-xs text-[#71605A]"><CalendarDays size={14} />{createdAt ? new Date(createdAt).toLocaleString() : "Date unavailable"}</p></div><div className="flex items-center gap-4"><div className="text-right"><p className="text-xl font-bold text-[#C9472E]">${total.toFixed(2)}</p><p className="mt-1 text-xs text-[#71605A]">{itemCount} {itemCount === 1 ? "item" : "items"} · {group.businessOrders.length} {group.businessOrders.length === 1 ? "business" : "businesses"}</p><p className="mt-1 text-xs font-semibold text-[#C9472E]">{expanded ? "Hide details" : "View details"}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EEDFD3] bg-white text-[#C9472E]"><ChevronDown size={18} className={`transition-transform ${expanded ? "rotate-180" : ""}`} /></span></div></button>
                  {expanded && <div className="divide-y divide-[#EEDFD3]">{group.businessOrders.map((order) => <section key={order._id} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 font-semibold"><Store size={17} className="text-[#E85D3F]" />{order.business_name || "Local business"}</div><div className="flex gap-2"><span className="rounded-full bg-[#FFF0E5] px-3 py-1 text-xs font-semibold capitalize text-[#C9472E]">{order.order_status.replaceAll("_", " ")}</span><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold capitalize text-green-700">{order.payment_status.replaceAll("_", " ")}</span></div></div>
                    <div className="mt-4 space-y-2">{order.items?.map((item) => <div key={item.listing_id} className="flex items-center justify-between gap-4 text-sm"><span className="text-[#71605A]">{item.quantity} × {item.title}</span><span className="font-semibold">${(item.quantity * item.unit_price).toFixed(2)}</span></div>)}</div>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#EEDFD3] pt-3 text-xs text-[#71605A]"><span className="flex items-center gap-1.5 capitalize"><PackageCheck size={14} />{order.fulfillment_type || "pickup"}</span>{order.delivery_address && <span className="flex items-center gap-1.5"><MapPin size={14} />{order.delivery_address}</span>}<span className="ml-auto font-semibold text-[#3A2925]">Business order #{order._id.slice(-8).toUpperCase()}</span></div>
                    {order.order_status !== "cancelled" && <div className="mt-5 grid grid-cols-4 gap-1">{progressSteps(order.fulfillment_type).map((step,index,steps)=>{ const current=Math.max(0,steps.indexOf(order.order_status)); const done=index<=current; return <div key={step} className="text-center"><div className={`mx-auto h-2 w-full rounded-full ${done?"bg-[#E85D3F]":"bg-[#EEDFD3]"}`}/><p className={`mt-2 text-[10px] font-semibold capitalize ${done?"text-[#C9472E]":"text-[#9A8981]"}`}>{step.replaceAll("_"," ")}</p></div>;})}</div>}
                    {order.order_status === "completed" && order.items?.map((item) => <div key={`review-${item.listing_id}`} className="mt-4 border-t border-[#EEDFD3] pt-3"><p className="text-sm font-semibold text-[#3A2925]">Review {item.title}</p><ReviewForm target="listing" targetId={item.listing_id} /></div>)}
                  </section>)}</div>}
                </article>
              )})}
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
