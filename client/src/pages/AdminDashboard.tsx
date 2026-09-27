import { useEffect, useState } from "react";
import { ArrowRight, Building2, ClipboardList, HeartHandshake, Package, ShieldCheck, Users, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardShell from "../components/layout/DashboardShell";
import MetricCard from "../components/ui/MetricCard";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import { dashboardService, type AdminSummary } from "../services/dashboardService";

const adminActions = [
  { to: "/admin/charities", title: "Review charities", text: "Verify pending charity accounts.", icon: ShieldCheck },
  { to: "/admin/businesses", title: "Manage businesses", text: "Review registered marketplace sellers.", icon: Building2 },
  { to: "/admin/listings", title: "Moderate listings", text: "Inspect and disable inappropriate listings.", icon: Package },
  { to: "/admin/donations", title: "Track donations", text: "Follow food through the donation lifecycle.", icon: HeartHandshake },
];

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  async function loadDashboard() {
    setLoading(true); setError(false);
    try { setSummary(await dashboardService.getAdminSummary()); } catch { setError(true); } finally { setLoading(false); }
  }
  useEffect(() => { void loadDashboard(); }, []);

  return (
    <DashboardShell role="admin" title="Platform overview" description="Monitor marketplace health, moderation work, and community impact.">
      {loading ? <LoadingSpinner /> : error || !summary ? <ErrorState message="We couldn't load the admin dashboard." onRetry={() => void loadDashboard()} /> : (
        <>
          {summary.pending_charities > 0 && (
            <section className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0" size={22} /><div><h2 className="font-bold">Charity verification needs attention</h2><p className="mt-1 text-sm">{summary.pending_charities} {summary.pending_charities === 1 ? "application is" : "applications are"} waiting for review.</p></div></div>
              <Link to="/admin/charities" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold shadow-sm">Review applications <ArrowRight size={15} /></Link>
            </section>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<Users size={21} />} label="Platform users" value={summary.total_users} />
            <MetricCard icon={<Building2 size={21} />} label="Businesses" value={summary.total_businesses} />
            <MetricCard icon={<Package size={21} />} label="Active listings" value={summary.active_listings} sublabel={`${summary.total_listings} total`} />
            <MetricCard icon={<ClipboardList size={21} />} label="Orders" value={summary.total_orders} />
          </div>

          <section>
            <div className="mb-4"><h2 className="font-display text-2xl font-bold text-[#3A2925]">Administration</h2><p className="mt-1 text-sm text-[#71605A]">Jump directly to the areas that need regular review.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{adminActions.map(({ to, title, text, icon: Icon }) => (
              <Link key={to} to={to} className="group rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#E85D3F] hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF0E5] text-[#E85D3F]"><Icon size={21} /></span>
                <h3 className="mt-4 font-bold text-[#3A2925]">{title}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-[#71605A]">{text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#C9472E]">Open <ArrowRight className="transition-transform group-hover:translate-x-1" size={15} /></span>
              </Link>
            ))}</div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-[#EEDFD3] bg-[#3A2925] p-6 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#F6B73C]">Community network</p>
              <div className="mt-5 grid grid-cols-2 gap-5">
                <div><p className="font-display text-4xl font-bold">{summary.total_charities}</p><p className="mt-1 text-sm text-[#E3CFC2]">registered charities</p></div>
                <div><p className="font-display text-4xl font-bold">{summary.verified_charities}</p><p className="mt-1 text-sm text-[#E3CFC2]">verified charities</p></div>
              </div>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#F6B73C]" style={{ width: `${summary.total_charities ? Math.round((summary.verified_charities / summary.total_charities) * 100) : 0}%` }} /></div>
              <p className="mt-2 text-xs text-[#C9B3A6]">{summary.total_charities ? Math.round((summary.verified_charities / summary.total_charities) * 100) : 0}% verified</p>
            </section>
            <section className="rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF0E5] text-[#E85D3F]"><HeartHandshake size={21} /></span><div><p className="font-display text-3xl font-bold text-[#3A2925]">{summary.total_donations}</p><p className="text-sm text-[#71605A]">donations created across BalaHader</p></div></div>
              <div className="mt-5 border-t border-[#EEDFD3] pt-5"><p className="flex items-center gap-2 text-sm font-semibold text-[#3A2925]"><UsersRound className="text-[#E85D3F]" size={18} />{summary.total_users} people and organizations connected</p></div>
            </section>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
