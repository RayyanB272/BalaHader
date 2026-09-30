import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, CheckCircle2, Clock3, Eye, FileText, MapPin, Phone, Search, ShieldCheck, X } from "lucide-react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import MetricCard from "../components/ui/MetricCard";
import { getAdminCharities, rejectCharity, verifyCharity, type AdminCharity } from "../services/adminCharityService";
import { updateAdminUserStatus } from "../services/adminUserService";

const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
const verificationClass = (status: string) => status === "verified" ? "bg-green-50 text-green-700" : status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800";

export default function AdminCharitiesPage() {
  const [charities, setCharities] = useState<AdminCharity[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [selected, setSelected] = useState<AdminCharity | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadCharities() {
    setLoading(true); setLoadError(false);
    try { setCharities(await getAdminCharities()); } catch { setLoadError(true); } finally { setLoading(false); }
  }
  useEffect(() => { void loadCharities(); }, []);
  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    const previous = document.body.style.overflow;
    document.addEventListener("keydown", close); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = previous; };
  }, [selected]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return charities.filter((charity) =>
      (statusFilter === "all" || charity.verification_status === statusFilter) &&
      (accountFilter === "all" || charity.user_status === accountFilter) &&
      (!query || [charity.organization_name, charity.area, charity.phone, charity.address].join(" ").toLowerCase().includes(query))
    );
  }, [charities, search, statusFilter, accountFilter]);
  const hasFilters = Boolean(search.trim()) || statusFilter !== "all" || accountFilter !== "all";

  function updateLocal(id: string, values: Partial<AdminCharity>) {
    setCharities((current) => current.map((item) => item._id === id ? { ...item, ...values } : item));
    setSelected((current) => current?._id === id ? { ...current, ...values } : current);
  }

  async function decide(charity: AdminCharity, action: "verify" | "reject") {
    if (reason.trim().length < 3) { setActionError("Enter a reason containing at least 3 characters."); return; }
    setUpdatingId(charity._id); setActionError("");
    try {
      if (action === "verify") await verifyCharity(charity._id, reason.trim()); else await rejectCharity(charity._id, reason.trim());
      updateLocal(charity._id, { verification_status: action === "verify" ? "verified" : "rejected", verification_reason: reason.trim(), verified_at: new Date().toISOString() });
      setReason("");
    } catch (error) {
      setActionError(axios.isAxiosError(error) && typeof error.response?.data?.detail === "string" ? error.response.data.detail : "The verification status could not be updated.");
    } finally { setUpdatingId(null); }
  }

  async function changeAccountStatus(charity: AdminCharity) {
    const nextStatus = charity.user_status === "suspended" ? "active" : "suspended";
    setUpdatingId(charity.user_id); setActionError("");
    try { await updateAdminUserStatus(charity.user_id, nextStatus); updateLocal(charity._id, { user_status: nextStatus }); }
    catch (error) { setActionError(axios.isAxiosError(error) && typeof error.response?.data?.detail === "string" ? error.response.data.detail : "The account status could not be updated."); }
    finally { setUpdatingId(null); }
  }

  return (
    <DashboardShell role="admin" title="Charity verification" description="Review charity applications and manage their platform access.">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={<ShieldCheck size={21} />} label="All charities" value={charities.length} />
        <MetricCard icon={<Clock3 size={21} />} label="Pending review" value={charities.filter((item) => item.verification_status === "pending").length} />
        <MetricCard icon={<CheckCircle2 size={21} />} label="Verified" value={charities.filter((item) => item.verification_status === "verified").length} />
      </div>

      <section className="rounded-2xl border border-[#EEDFD3] bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_220px_190px]">
          <label className="relative block"><span className="sr-only">Search charities</span><Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A58D85]" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search organization, phone, or area..." className="w-full rounded-xl border border-[#EEDFD3] py-3 pl-11 pr-4 text-sm outline-none focus:border-[#E85D3F] focus:ring-2 focus:ring-[#E85D3F]/10" /></label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by verification status" className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"><option value="all">All verification statuses</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select>
          <select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)} aria-label="Filter by account status" className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"><option value="all">All account statuses</option><option value="active">Active accounts</option><option value="suspended">Suspended accounts</option></select>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-[#71605A]"><span>{filtered.length} {filtered.length === 1 ? "charity" : "charities"} shown</span>{hasFilters && <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); setAccountFilter("all"); }} className="font-semibold text-[#C9472E] hover:underline">Clear filters</button>}</div>
      </section>
      {actionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>}

      {loading ? <LoadingSpinner /> : loadError ? <ErrorState message="We couldn't load charity accounts." onRetry={() => void loadCharities()} /> : filtered.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white"><EmptyState title={charities.length ? "No matching charities" : "No charities found"} description={charities.length ? "Change the search text or filters." : "Registered charity profiles will appear here."} /></section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(250px,1.5fr)_1fr_1fr_150px_52px] gap-5 border-b border-[#EEDFD3] bg-[#FFF4E9] px-6 py-3 text-xs font-bold uppercase tracking-wide text-[#8D655A] lg:grid"><span>Charity</span><span>Location</span><span>Verification</span><span>Registered</span><span className="sr-only">Details</span></div>
          <div className="divide-y divide-[#EEDFD3]">{filtered.map((charity) => (
            <article key={charity._id} className="grid gap-4 p-5 transition hover:bg-[#FFFCF8] lg:grid-cols-[minmax(250px,1.5fr)_1fr_1fr_150px_52px] lg:items-center lg:gap-5 lg:px-6">
              <div className="flex min-w-0 items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3A2925] text-sm font-bold text-[#FFC247]">{initials(charity.organization_name)}</div><div className="min-w-0"><h2 className="truncate font-bold text-[#3A2925]">{charity.organization_name}</h2><div className="mt-1 flex gap-2"><p className="truncate text-xs text-[#71605A]">{charity.phone}</p>{charity.user_status === "suspended" && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">Suspended</span>}</div></div></div>
              <div className="flex min-w-0 items-center gap-2 text-sm text-[#5E4A44]"><MapPin size={16} className="shrink-0 text-[#E85D3F]" /><span className="truncate">{charity.area}</span></div>
              <div><span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${verificationClass(charity.verification_status)}`}>{charity.verification_status}</span></div>
              <div className="flex items-center gap-2 text-sm text-[#71605A]"><CalendarDays size={15} className="lg:hidden" />{new Date(charity.created_at).toLocaleDateString()}</div>
              <button type="button" onClick={() => { setSelected(charity); setReason(""); setActionError(""); }} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#EEDFD3] text-sm font-semibold text-[#C9472E] hover:border-[#E85D3F] hover:bg-[#FFF0E5] lg:w-10" aria-label={`Review ${charity.organization_name}`}><Eye size={17} /><span className="lg:sr-only">View details</span></button>
            </article>
          ))}</div>
        </section>
      )}

      {selected && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:pl-72" role="presentation">
        <div className="absolute inset-0 bg-[#241815]/20 backdrop-blur-[2px]" onMouseDown={() => setSelected(null)} />
        <section role="dialog" aria-modal="true" aria-labelledby="charity-dialog-title" className="relative z-10 flex max-h-[min(680px,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#EEDFD3] bg-white shadow-[0_30px_90px_rgba(36,24,21,0.36)]">
          <header className="relative shrink-0 bg-[#3A2925] px-6 pb-5 pt-5 text-white"><button type="button" onClick={() => setSelected(null)} aria-label="Close charity details" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 hover:bg-white/20"><X size={18} /></button><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFC247] text-lg font-bold text-[#3A2925]">{initials(selected.organization_name)}</div><p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFC247]">Charity application</p><h2 id="charity-dialog-title" className="mt-1 pr-10 font-display text-2xl font-bold">{selected.organization_name}</h2></header>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            <div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${verificationClass(selected.verification_status)}`}>{selected.verification_status}</span><span className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${selected.user_status === "suspended" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{selected.user_status || "active"} account</span></div>
            {selected.description && <p className="text-sm leading-6 text-[#71605A]">{selected.description}</p>}
            <dl className="grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-2xl border border-[#EEDFD3] p-4"><dt className="flex items-center gap-2 text-xs text-[#71605A]"><Phone size={14} />Phone</dt><dd className="mt-2 font-semibold text-[#3A2925]">{selected.phone}</dd></div><div className="rounded-2xl border border-[#EEDFD3] p-4"><dt className="flex items-center gap-2 text-xs text-[#71605A]"><MapPin size={14} />Area</dt><dd className="mt-2 font-semibold text-[#3A2925]">{selected.area}</dd></div><div className="rounded-2xl border border-[#EEDFD3] p-4 sm:col-span-2"><dt className="text-xs text-[#71605A]">Address</dt><dd className="mt-2 font-semibold text-[#3A2925]">{selected.address}</dd></div></dl>
            <div className="flex items-center justify-between rounded-2xl bg-[#FFF9EE] p-4"><div className="flex items-center gap-3"><FileText size={20} className="text-[#E85D3F]" /><div><p className="font-semibold text-[#3A2925]">Verification document</p><p className="text-xs text-[#71605A]">Review the submitted proof</p></div></div>{selected.verification_document_url ? <a href={selected.verification_document_url} target="_blank" rel="noreferrer" className="font-semibold text-[#C9472E] underline">Open</a> : <span className="text-xs font-semibold text-amber-700">Missing</span>}</div>
            {selected.verification_status === "pending" && <section className="rounded-2xl border border-[#EEDFD3] p-4"><label className="text-sm font-bold text-[#3A2925]">Decision reason</label><textarea rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the verification decision..." className="mt-2 w-full resize-none rounded-xl border border-[#EEDFD3] px-4 py-3 text-sm outline-none focus:border-[#E85D3F]" /><div className="mt-3 grid grid-cols-2 gap-3"><button type="button" disabled={updatingId === selected._id} onClick={() => void decide(selected, "reject")} className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">Reject</button><button type="button" disabled={updatingId === selected._id} onClick={() => void decide(selected, "verify")} className="rounded-xl bg-[#E85D3F] px-4 py-3 text-sm font-semibold text-white hover:bg-[#C9472E] disabled:opacity-60">Verify</button></div></section>}
            {selected.verification_status !== "pending" && selected.verification_reason && <div className="rounded-2xl bg-[#FFF9EE] p-4 text-sm"><p className="font-bold text-[#3A2925]">Decision reason</p><p className="mt-2 text-[#71605A]">{selected.verification_reason}</p></div>}
            <div className="flex justify-end border-t border-[#EEDFD3] pt-4"><button type="button" disabled={updatingId === selected.user_id} onClick={() => void changeAccountStatus(selected)} className={`rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60 ${selected.user_status === "suspended" ? "bg-[#E85D3F] text-white hover:bg-[#C9472E]" : "border border-red-200 text-red-700 hover:bg-red-50"}`}>{updatingId === selected.user_id ? "Updating..." : selected.user_status === "suspended" ? "Reactivate account" : "Suspend account"}</button></div>
          </div>
        </section>
      </div>, document.body)}
    </DashboardShell>
  );
}
