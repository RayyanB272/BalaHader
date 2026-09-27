import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock3, PackageCheck, ShoppingBag, ShoppingCart, Sparkles } from "lucide-react";
import PageFrame from "../components/layout/PageFrame";
import MetricCard from "../components/ui/MetricCard";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import { dashboardService, type OrderSummary, type UserProfile } from "../services/dashboardService";
import { getListings, type Listing } from "../services/listingService";
import { getCartCount } from "../services/cartService";

function cachedProfile(): UserProfile | null {
  try {
    const cached = JSON.parse(localStorage.getItem("balahader_user_name") || "null");
    return cached?.first_name ? { id: "", email: "", role: "customer", first_name: cached.first_name, last_name: cached.last_name ?? "" } : null;
  } catch {
    return null;
  }
}

export default function CustomerDashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [recommendations, setRecommendations] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const orderCount = new Set(orders.map((order) => order.checkout_id || order._id)).size;
  const completedOrderCount = new Set(
    orders
      .filter((order) => order.order_status === "completed")
      .map((order) => order.checkout_id || order._id)
  ).size;

  useEffect(() => {
    let active = true;
    dashboardService.getProfile().then((user) => {
      if (!active) return;
      setProfile(user);
      localStorage.setItem("balahader_user_name", JSON.stringify({ first_name: user.first_name, last_name: user.last_name }));
    }).catch(() => undefined);

    Promise.all([dashboardService.getCustomerOrders(), getListings()])
      .then(([recentOrders, availableListings]) => {
        if (active) { setOrders(recentOrders); setRecommendations(availableListings.slice(0, 3)); setError(false); }
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  return (
    <PageFrame>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-10 sm:px-6">
        <div className="mb-8 overflow-hidden rounded-3xl bg-[#3A2925] px-6 py-8 text-white shadow-sm sm:px-10 sm:py-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div><p className="text-sm font-semibold uppercase tracking-wider text-[#F6B73C]">Your BalaHader</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Welcome back{profile?.first_name ? `, ${profile.first_name}` : ""}</h1><p className="mt-2 max-w-2xl text-white/75">Rescue something delicious today and support a local business.</p></div>
            <div className="flex flex-wrap gap-3"><Link to="/browse" className="inline-flex items-center gap-2 rounded-xl bg-[#E85D3F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#D94F34]">Browse food <ArrowRight size={17} /></Link><Link to="/smart-basket" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"><Sparkles size={17} /> Smart Basket</Link></div>
          </div>
        </div>
      {loading ? <LoadingSpinner /> : error ? <ErrorState message="We couldn't load your dashboard." onRetry={() => { setLoading(true); setReload((value) => value + 1); }} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard icon={<ShoppingBag size={21} />} label="Orders placed" value={orderCount} />
            <MetricCard icon={<PackageCheck size={21} />} label="Completed orders" value={completedOrderCount} />
            <MetricCard icon={<ShoppingCart size={21} />} label="Items in cart" value={getCartCount()} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm"><ShoppingBag className="text-[#E85D3F]" /><h2 className="mt-4 text-xl font-bold text-[#3A2925]">Browse food near you</h2><p className="mt-1 text-sm text-[#71605A]">See today's surplus food from local businesses.</p><Link to="/browse" className="mt-5 inline-flex rounded-xl bg-[#E85D3F] px-5 py-2.5 text-sm font-semibold text-white">Browse food</Link></section>
            <section className="rounded-2xl border border-[#EEDFD3] bg-[#FFF0E5] p-6 shadow-sm"><Sparkles className="text-[#E85D3F]" /><h2 className="mt-4 text-xl font-bold text-[#3A2925]">Let AI plan your basket</h2><p className="mt-1 text-sm text-[#71605A]">Choose a budget, people, and meals. Smart Basket finds a suitable combination.</p><Link to="/smart-basket" className="mt-5 inline-flex rounded-xl border border-[#E85D3F] bg-white px-5 py-2.5 text-sm font-semibold text-[#C9472E]">Build a basket</Link></section>
          </div>
          {recommendations.length > 0 && (
            <section>
              <div className="mb-4 flex items-end justify-between"><div><h2 className="text-2xl font-bold text-[#3A2925]">Available now</h2><p className="mt-1 text-sm text-[#71605A]">Fresh surplus food you can rescue today.</p></div><Link to="/browse" className="text-sm font-semibold text-[#C9472E]">View all →</Link></div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{recommendations.map((listing) => (
                <Link key={listing._id} to={`/food/${listing._id}`} className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  {listing.image_url ? <img src={listing.image_url} alt={listing.title} className="h-40 w-full object-cover" /> : <div className="flex h-40 items-center justify-center bg-[#FFF0E5] text-4xl">🍲</div>}
                  <div className="p-4"><p className="text-xs font-semibold uppercase text-[#C9472E]">{listing.category.replaceAll("_", " ")}</p><h3 className="mt-1 font-bold text-[#3A2925]">{listing.title}</h3><div className="mt-3 flex items-center justify-between"><span className="font-bold text-[#C9472E]">${listing.discounted_price.toFixed(2)}</span><span className="text-xs text-[#71605A]">{listing.available_quantity} available</span></div></div>
                </Link>
              ))}</div>
            </section>
          )}
          <section className="rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-[#3A2925]">Recent orders</h2><p className="mt-1 text-sm text-[#71605A]">Track your latest purchases and pickups.</p></div><Link to="/orders" className="text-sm font-semibold text-[#C9472E]">View all →</Link></div>
            {orders.length === 0 ? <EmptyState title="No orders yet" description="Your orders will appear here after you place one." /> : (
              <div className="mt-4 divide-y divide-[#EEDFD3]">
                {orders.slice(0, 5).map((order) => (
                  <div key={order._id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                    <div className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF0E5] text-[#C9472E]"><Clock3 size={17} /></span><div><p className="font-semibold text-[#3A2925]">Order #{order._id.slice(-8).toUpperCase()}</p><p className="mt-1 capitalize text-[#71605A]">Payment {order.payment_status.replaceAll("_", " ")}</p></div></div>
                    <div className="flex items-center gap-3"><span className="rounded-full bg-[#FFF0E5] px-3 py-1 text-xs font-semibold capitalize text-[#C9472E]">{order.order_status.replaceAll("_", " ")}</span><span className="font-semibold text-[#3A2925]">${order.total_amount.toFixed(2)}</span></div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      </main>
    </PageFrame>
  );
}
