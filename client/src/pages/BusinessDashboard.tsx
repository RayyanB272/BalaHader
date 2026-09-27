import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { ArrowRight, ClipboardList, Clock3, HeartHandshake, PackageCheck, Plus, Sparkles, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardShell from "../components/layout/DashboardShell";
import MetricCard from "../components/ui/MetricCard";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import BrandIcon from "../components/ui/BrandIcon";
import ProfileSetup from "../components/ProfileSetup";
import { dashboardService, type BusinessSummary } from "../services/dashboardService";
import { getBusinessOrders, type BusinessOrder } from "../services/businessOrderService";
import { getBusinessListings, type BusinessListing } from "../services/businessListingService";
import { getBusinessDonations, type BusinessDonation } from "../services/businessDonationService";

const formatStatus = (value: string) => value.replaceAll("_", " ");

export default function BusinessDashboard() {
  const [summary, setSummary] = useState<BusinessSummary | null>(null);
  const [orders, setOrders] = useState<BusinessOrder[]>([]);
  const [listings, setListings] = useState<BusinessListing[]>([]);
  const [donations, setDonations] = useState<BusinessDonation[]>([]);
  const [missingProfile, setMissingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      setLoading(true);
      setError(false);
      try {
        const [summaryResult, orderResult, listingResult, donationResult] = await Promise.all([
          dashboardService.getBusinessSummary(),
          getBusinessOrders(),
          getBusinessListings(),
          getBusinessDonations(),
        ]);
        if (!active) return;
        setSummary(summaryResult);
        setOrders(orderResult);
        setListings(listingResult);
        setDonations(donationResult);
        setMissingProfile(false);
      } catch (cause: unknown) {
        if (!active) return;
        if (isAxiosError(cause) && cause.response?.status === 404) setMissingProfile(true);
        else setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDashboard();
    return () => { active = false; };
  }, [reload]);

  const ordersNeedingAction = orders.filter((order) => order.payment_status === "paid" && !["completed", "cancelled"].includes(order.order_status));
  const donationsNeedingAction = donations.filter((donation) => donation.status === "claimed");
  const expiringListings = useMemo(() => listings
    .filter((listing) => listing.status === "active")
    .sort((a, b) => new Date(a.sale_deadline).getTime() - new Date(b.sale_deadline).getTime())
    .slice(0, 4), [listings]);
  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);

  return (
    <DashboardShell role="business" title="Business overview" description="Track today's work, sales, listings, and community impact.">
      {loading ? <LoadingSpinner /> : missingProfile ? (
        <ProfileSetup role="business" onComplete={() => { setLoading(true); setReload((value) => value + 1); }} />
      ) : error || !summary ? (
        <ErrorState message="We couldn't load your business dashboard." onRetry={() => { setLoading(true); setReload((value) => value + 1); }} />
      ) : (
        <>
          {(ordersNeedingAction.length > 0 || donationsNeedingAction.length > 0) && (
            <section className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="font-bold">You have items that need attention</h2><p className="mt-1 text-sm">{ordersNeedingAction.length} active customer {ordersNeedingAction.length === 1 ? "order" : "orders"} and {donationsNeedingAction.length} claimed {donationsNeedingAction.length === 1 ? "donation" : "donations"}.</p></div>
              <Link to={ordersNeedingAction.length ? "/business/orders" : "/business/donations"} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold shadow-sm">Review now <ArrowRight size={15} /></Link>
            </section>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<ClipboardList size={21} />} label="Active listings" value={summary.active_listings} sublabel={`${summary.total_listings} total`} />
            <MetricCard icon={<PackageCheck size={21} />} label="Completed orders" value={summary.completed_orders} sublabel={`${summary.total_orders} total`} />
            <MetricCard icon={<Wallet size={21} />} label="Earnings" value={`$${summary.earnings.toFixed(2)}`} />
            <MetricCard icon={<HeartHandshake size={21} />} label="Completed donations" value={summary.completed_donations} sublabel={`${summary.total_donations} total`} />
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Link to="/business/listings/new" className="group rounded-2xl bg-[#E85D3F] p-5 text-white shadow-sm transition hover:bg-[#C9472E]"><Plus size={23} /><h2 className="mt-4 font-bold">Create a listing</h2><p className="mt-1 text-sm text-white/80">Publish surplus food for customers.</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">Start <ArrowRight className="transition-transform group-hover:translate-x-1" size={15} /></span></Link>
            <Link to="/business/orders" className="group rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm transition hover:border-[#E85D3F]"><ClipboardList className="text-[#E85D3F]" size={23} /><h2 className="mt-4 font-bold text-[#3A2925]">Manage orders</h2><p className="mt-1 text-sm text-[#71605A]">{ordersNeedingAction.length} currently need attention.</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#C9472E]">Open orders <ArrowRight size={15} /></span></Link>
            <Link to="/business/donations" className="group rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm transition hover:border-[#E85D3F]"><HeartHandshake className="text-[#E85D3F]" size={23} /><h2 className="mt-4 font-bold text-[#3A2925]">Food donations</h2><p className="mt-1 text-sm text-[#71605A]">{donationsNeedingAction.length} claimed and waiting.</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#C9472E]">Manage donations <ArrowRight size={15} /></span></Link>
            <Link to="/business/insights" className="group rounded-2xl border border-[#EEDFD3] bg-[#3A2925] p-5 text-white shadow-sm transition hover:bg-[#4A3530]"><Sparkles className="text-[#F6B73C]" size={23} /><h2 className="mt-4 font-bold">Seller insights</h2><p className="mt-1 text-sm text-[#E3CFC2]">Understand unsold food patterns.</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#F6B73C]">View insights <ArrowRight size={15} /></span></Link>
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-2">
            <section className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#EEDFD3] px-6 py-4"><div><h2 className="font-display text-xl font-bold text-[#3A2925]">Recent orders</h2><p className="mt-1 text-sm text-[#71605A]">Latest customer activity.</p></div><Link to="/business/orders" className="text-sm font-semibold text-[#C9472E]">View all</Link></div>
              {recentOrders.length === 0 ? <div className="px-6 py-10 text-center"><BrandIcon size="lg" className="mx-auto" /><p className="mt-4 text-sm text-[#71605A]">No customer orders yet.</p></div> : (
                <div className="divide-y divide-[#EEDFD3]">{recentOrders.map((order) => <div key={order._id} className="flex items-center justify-between gap-4 px-6 py-4"><div><p className="font-semibold text-[#3A2925]">Order #{order._id.slice(-8).toUpperCase()}</p><p className="mt-1 text-xs text-[#71605A]">{order.items.length} {order.items.length === 1 ? "item" : "items"} · {new Date(order.created_at).toLocaleString()}</p></div><div className="text-right"><span className="rounded-full bg-[#FFF0E5] px-3 py-1 text-xs font-semibold capitalize text-[#C9472E]">{formatStatus(order.order_status)}</span>{typeof order.total_amount === "number" && <p className="mt-2 text-sm font-bold text-[#3A2925]">${order.total_amount.toFixed(2)}</p>}</div></div>)}</div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#EEDFD3] px-6 py-4"><div><h2 className="font-display text-xl font-bold text-[#3A2925]">Listing deadlines</h2><p className="mt-1 text-sm text-[#71605A]">Active food ending soonest.</p></div><Link to="/business/listings" className="text-sm font-semibold text-[#C9472E]">View all</Link></div>
              {expiringListings.length === 0 ? <div className="px-6 py-10 text-center"><Clock3 className="mx-auto text-[#E85D3F]" size={28} /><p className="mt-4 text-sm text-[#71605A]">No active listings.</p></div> : (
                <div className="divide-y divide-[#EEDFD3]">{expiringListings.map((listing) => <div key={listing._id} className="flex items-center gap-4 px-6 py-4">{listing.image_url ? <img src={listing.image_url} alt={listing.title} className="h-14 w-14 rounded-xl object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#FFF0E5]"><BrandIcon /></span>}<div className="min-w-0 flex-1"><p className="truncate font-semibold text-[#3A2925]">{listing.title}</p><p className="mt-1 text-xs text-[#71605A]">{Math.max(0, listing.remaining_quantity - (listing.reserved_quantity ?? 0))} available</p></div><div className="text-right"><p className="text-xs font-semibold text-[#C9472E]">{new Date(listing.sale_deadline).toLocaleDateString()}</p><p className="mt-1 text-xs text-[#71605A]">{new Date(listing.sale_deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div></div>)}</div>
              )}
            </section>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
