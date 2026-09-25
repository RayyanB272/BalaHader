import { useEffect, useState } from "react";
import DashboardShell from "../components/layout/DashboardShell";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { getCharityOrders, type CharityDonation } from "../services/charityDonationService";

export default function CharityOrdersPage() {
  const [orders, setOrders] = useState<CharityDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try { setOrders(await getCharityOrders()); }
    catch { setError(true); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return (
    <DashboardShell role="charity" title="Donation orders" description="See every donation your charity has claimed and its pickup status.">
      {loading ? <LoadingSpinner /> : error ? <ErrorState message="We couldn't load your donation orders." onRetry={() => void load()} /> : orders.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white"><EmptyState title="No donation orders" description="Claimed donations will appear here." /></section>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#FFF0E5] text-[#71605A]"><tr><th className="px-5 py-3">Donation</th><th className="px-5 py-3">Quantity</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Claimed</th></tr></thead>
              <tbody className="divide-y divide-[#EEDFD3]">{orders.map((order) => (
                <tr key={order._id}>
                  <td className="px-5 py-4"><div className="flex items-center gap-3">{order.image_url ? <img src={order.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFF0E5]">🍲</span>}<div><p className="font-semibold text-[#3A2925]">{order.title}</p><p className="text-xs text-[#71605A]">#{order._id.slice(-8).toUpperCase()}</p></div></div></td>
                  <td className="px-5 py-4">{order.quantity}</td>
                  <td className="px-5 py-4 capitalize">{order.status.replaceAll("_", " ")}</td>
                  <td className="px-5 py-4 text-[#71605A]">{order.claimed_at ? new Date(order.claimed_at).toLocaleString() : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
