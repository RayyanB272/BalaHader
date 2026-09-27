import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Clock3, Eye, HeartHandshake, Sparkles, X } from "lucide-react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import BrandIcon from "../components/ui/BrandIcon";
import MetricCard from "../components/ui/MetricCard";
import { getAdminDonations, type AdminDonation } from "../services/adminDonationService";

const formatValue = (value: string) => value.replaceAll("_", " ");
function statusClass(status: string) {
  if (["completed", "collected"].includes(status)) return "bg-green-50 text-green-700";
  if (status === "cancelled") return "bg-red-50 text-red-700";
  if (status === "available") return "bg-[#FFF0E5] text-[#C9472E]";
  return "bg-amber-50 text-amber-800";
}

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<AdminDonation[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<AdminDonation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  async function loadDonations() {
    setLoading(true); setLoadError(false);
    try { setDonations(await getAdminDonations()); } catch { setLoadError(true); } finally { setLoading(false); }
  }
  useEffect(() => { void loadDonations(); }, []);
  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    document.addEventListener("keydown", close);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = previousOverflow; };
  }, [selected]);

  const statuses = useMemo(() => Array.from(new Set(donations.map((donation) => donation.status))), [donations]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return donations.filter((donation) => (statusFilter === "all" || donation.status === statusFilter) && (!query || [donation._id, donation.title, donation.category, donation.business_id, donation.charity_id].filter(Boolean).join(" ").toLowerCase().includes(query)));
  }, [donations, search, statusFilter]);

  return (
    <DashboardShell role="admin" title="Donation management" description="Monitor donations as they move from businesses to charities.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<HeartHandshake size={21} />} label="All donations" value={donations.length} />
        <MetricCard icon={<Clock3 size={21} />} label="Available" value={donations.filter((item) => item.status === "available").length} />
        <MetricCard icon={<CheckCircle2 size={21} />} label="Completed" value={donations.filter((item) => ["completed", "collected"].includes(item.status)).length} />
        <MetricCard icon={<Sparkles size={21} />} label="Automatic" value={donations.filter((item) => item.auto_generated).length} />
      </div>

      <section className="grid gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4 sm:grid-cols-[1fr_220px]">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search donations..." aria-label="Search donations" className="rounded-xl border border-[#EEDFD3] px-4 py-3 text-sm outline-none focus:border-[#E85D3F]" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter donations by status" className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm capitalize"><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{formatValue(status)}</option>)}</select>
      </section>

      {loading ? <LoadingSpinner /> : loadError ? <ErrorState message="We couldn't load the platform donations." onRetry={() => void loadDonations()} /> : filtered.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white"><EmptyState title={donations.length ? "No matching donations" : "No donations found"} description={donations.length ? "Change the search text or status filter." : "Business donations will appear here."} /></section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((donation) => (
            <article key={donation._id} className="group overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#E8BBAA] hover:shadow-md">
              <button type="button" onClick={() => setSelected(donation)} className="w-full text-left" aria-label={`View details for ${donation.title}`}>
                <div className="relative overflow-hidden">{donation.image_url ? <img src={donation.image_url} alt={donation.title} className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-44 items-center justify-center bg-[#FFF0E5]"><BrandIcon size="lg" /></div>}<span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold capitalize shadow-sm ${statusClass(donation.status)}`}>{formatValue(donation.status)}</span></div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#C9472E]">Donation #{donation._id.slice(-8).toUpperCase()}</p>
                  <h2 className="mt-2 truncate font-display text-xl font-bold text-[#3A2925]">{donation.title}</h2>
                  <div className="mt-3 flex items-center justify-between text-sm"><span className="capitalize text-[#71605A]">{donation.category ? formatValue(donation.category) : "Uncategorized"}</span><span className="font-semibold text-[#3A2925]">Qty {donation.quantity}</span></div>
                  <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#FFF0E5] px-4 py-2.5 text-sm font-semibold text-[#C9472E]"><Eye size={16} />View details</div>
                </div>
              </button>
            </article>
          ))}
        </div>
      )}

      {selected && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:pl-72" role="presentation">
          <div className="absolute inset-0 bg-[#241815]/15 backdrop-blur-sm" onMouseDown={() => setSelected(null)} aria-hidden="true" />
          <section role="dialog" aria-modal="true" aria-labelledby="donation-dialog-title" style={{ width: "min(440px, calc(100vw - 2rem))", height: "min(440px, calc(100dvh - 2rem))" }} className="relative z-10 flex shrink-0 flex-col overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white p-3 shadow-[0_30px_90px_rgba(36,24,21,0.42)]">
            <header className="mb-2 flex shrink-0 items-center justify-between px-1">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A66B5B]">Donation record</p><p className="mt-0.5 text-xs font-bold text-[#C9472E]">#{selected._id.slice(-8).toUpperCase()}</p></div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close donation details" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EEDFD3] bg-white text-[#3A2925] shadow-sm hover:border-[#E85D3F] hover:text-[#C9472E]"><X size={18} /></button>
            </header>
            <div className="shrink-0 overflow-hidden rounded-xl border border-[#EEDFD3]">
              {selected.image_url ? <img src={selected.image_url} alt={selected.title} className="h-16 w-full object-cover" /> : <div className="flex h-16 items-center justify-center bg-[#FFF0E5]"><BrandIcon /></div>}
            </div>
            <div className="mt-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1 pt-3 sm:px-2">
              <div className="flex items-start justify-between gap-3">
                <h2 id="donation-dialog-title" className="font-display text-xl font-bold text-[#3A2925]">{selected.title}</h2>
                <span className={`shrink-0 rounded-full border border-current/10 px-3 py-1 text-[11px] font-bold capitalize ${statusClass(selected.status)}`}>{formatValue(selected.status)}</span>
              </div>
              {selected.auto_generated && <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#FFF0E5] px-3 py-1.5 text-xs font-semibold text-[#C9472E]"><Sparkles size={14} />Automatically donated when unsold</p>}

              <dl className="mt-4 grid gap-3 rounded-2xl border border-[#EEDFD3] bg-[#FFF9EE] p-4 text-xs sm:grid-cols-2">
                <div><dt className="text-[#71605A]">Quantity</dt><dd className="mt-1 font-semibold text-[#3A2925]">{selected.quantity}</dd></div>
                <div><dt className="text-[#71605A]">Category</dt><dd className="mt-1 font-semibold capitalize text-[#3A2925]">{selected.category ? formatValue(selected.category) : "Uncategorized"}</dd></div>
                <div><dt className="text-[#71605A]">Business ID</dt><dd className="mt-1 break-all font-semibold text-[#3A2925]">{selected.business_id}</dd></div>
                <div><dt className="text-[#71605A]">Charity ID</dt><dd className="mt-1 break-all font-semibold text-[#3A2925]">{selected.charity_id || "Not claimed"}</dd></div>
              </dl>

              <section className="mt-4">
                <h3 className="text-sm font-bold text-[#3A2925]">Donation timeline</h3>
                <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-[#EEDFD3] bg-white p-3"><p className="font-semibold text-[#3A2925]">Created</p><p className="mt-1 text-[#71605A]">{new Date(selected.created_at).toLocaleString()}</p></div>
                  {selected.claimed_at && <div className="rounded-xl border border-[#EEDFD3] bg-white p-3"><p className="font-semibold text-[#3A2925]">Claimed</p><p className="mt-1 text-[#71605A]">{new Date(selected.claimed_at).toLocaleString()}</p></div>}
                  {selected.pickup_deadline && <div className="rounded-xl border border-[#EEDFD3] bg-white p-3"><p className="font-semibold text-[#3A2925]">Pickup deadline</p><p className="mt-1 text-[#71605A]">{new Date(selected.pickup_deadline).toLocaleString()}</p></div>}
                  {selected.completed_at && <div className="rounded-xl border border-green-100 bg-green-50 p-3"><p className="font-semibold text-green-800">Completed</p><p className="mt-1 text-green-700">{new Date(selected.completed_at).toLocaleString()}</p></div>}
                </div>
              </section>
            </div>
          </section>
        </div>,
        document.body
      )}
    </DashboardShell>
  );
}
