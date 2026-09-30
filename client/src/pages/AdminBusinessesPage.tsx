import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, CalendarDays, Eye, MapPin, Phone, Search, Store, Truck, X } from "lucide-react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import MetricCard from "../components/ui/MetricCard";
import { getAdminBusinesses, type AdminBusiness } from "../services/adminBusinessService";
import { updateAdminUserStatus } from "../services/adminUserService";

const formatType = (value: string) => value.replaceAll("_", " ");
const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<AdminBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadBusinesses() {
    setLoading(true); setLoadError(false);
    try { setBusinesses(await getAdminBusinesses()); } catch { setLoadError(true); } finally { setLoading(false); }
  }

  useEffect(() => { void loadBusinesses(); }, []);
  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener("keydown", close); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = previousOverflow; };
  }, [selected]);

  const businessTypes = useMemo(() => Array.from(new Set(businesses.map((item) => item.business_type))).sort(), [businesses]);
  const filteredBusinesses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return businesses.filter((business) => {
      const matchesType = typeFilter === "all" || business.business_type === typeFilter;
      const matchesService = serviceFilter === "all" || (serviceFilter === "delivery" ? business.delivery_enabled : !business.delivery_enabled);
      const matchesStatus = statusFilter === "all" || business.user_status === statusFilter;
      const matchesSearch = !query || [business.business_name, business.business_type, business.phone, business.address, business.area].join(" ").toLowerCase().includes(query);
      return matchesType && matchesService && matchesStatus && matchesSearch;
    });
  }, [businesses, search, typeFilter, serviceFilter, statusFilter]);
  const hasFilters = Boolean(search.trim()) || typeFilter !== "all" || serviceFilter !== "all" || statusFilter !== "all";

  async function changeAccountStatus(business: AdminBusiness) {
    const nextStatus = business.user_status === "suspended" ? "active" : "suspended";
    setUpdatingId(business.user_id); setActionError("");
    try {
      await updateAdminUserStatus(business.user_id, nextStatus);
      setBusinesses((current) => current.map((item) => item._id === business._id ? { ...item, user_status: nextStatus } : item));
      setSelected((current) => current?._id === business._id ? { ...current, user_status: nextStatus } : current);
    } catch (error) {
      setActionError(axios.isAxiosError(error) && typeof error.response?.data?.detail === "string" ? error.response.data.detail : "The account status could not be updated.");
    } finally { setUpdatingId(null); }
  }

  return (
    <DashboardShell role="admin" title="Business management" description="Browse registered businesses and review their marketplace information.">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={<Building2 size={21} />} label="Registered businesses" value={businesses.length} />
        <MetricCard icon={<Truck size={21} />} label="Delivery enabled" value={businesses.filter((item) => item.delivery_enabled).length} />
        <MetricCard icon={<Store size={21} />} label="Pickup only" value={businesses.filter((item) => !item.delivery_enabled).length} />
      </div>

      <section className="rounded-2xl border border-[#EEDFD3] bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_200px_190px_170px]">
          <label className="relative block">
            <span className="sr-only">Search businesses</span>
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A58D85]" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, type, or area..." className="w-full rounded-xl border border-[#EEDFD3] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#E85D3F] focus:ring-2 focus:ring-[#E85D3F]/10" />
          </label>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by business type" className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm capitalize outline-none focus:border-[#E85D3F]">
            <option value="all">All business types</option>
            {businessTypes.map((type) => <option key={type} value={type}>{formatType(type)}</option>)}
          </select>
          <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} aria-label="Filter by fulfillment service" className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm outline-none focus:border-[#E85D3F]">
            <option value="all">All fulfillment</option><option value="delivery">Delivery enabled</option><option value="pickup">Pickup only</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by account status" className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm outline-none focus:border-[#E85D3F]">
            <option value="all">All account statuses</option><option value="active">Active</option><option value="suspended">Suspended</option>
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#71605A]">
          <span>{filteredBusinesses.length} {filteredBusinesses.length === 1 ? "business" : "businesses"} shown</span>
          {hasFilters && <button type="button" onClick={() => { setSearch(""); setTypeFilter("all"); setServiceFilter("all"); setStatusFilter("all"); }} className="font-semibold text-[#C9472E] hover:underline">Clear filters</button>}
        </div>
      </section>

      {actionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>}

      {loading ? <LoadingSpinner /> : loadError ? <ErrorState message="We couldn't load the registered businesses." onRetry={() => void loadBusinesses()} /> : filteredBusinesses.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white"><EmptyState title={businesses.length ? "No matching businesses" : "No businesses found"} description={businesses.length ? "Change the search text or filters." : "Registered business profiles will appear here."} /></section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(250px,1.5fr)_1fr_1fr_150px_52px] gap-5 border-b border-[#EEDFD3] bg-[#FFF4E9] px-6 py-3 text-xs font-bold uppercase tracking-wide text-[#8D655A] lg:grid">
            <span>Business</span><span>Location</span><span>Service</span><span>Registered</span><span className="sr-only">Details</span>
          </div>
          <div className="divide-y divide-[#EEDFD3]">
            {filteredBusinesses.map((business) => (
              <article key={business._id} className="group grid gap-4 p-5 transition hover:bg-[#FFFCF8] lg:grid-cols-[minmax(250px,1.5fr)_1fr_1fr_150px_52px] lg:items-center lg:gap-5 lg:px-6">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3A2925] text-sm font-bold text-[#FFC247] shadow-sm">{initials(business.business_name) || <Store size={20} />}</div>
                  <div className="min-w-0"><h2 className="truncate font-bold text-[#3A2925]">{business.business_name}</h2><div className="mt-1 flex flex-wrap items-center gap-2"><p className="text-xs capitalize text-[#71605A]">{formatType(business.business_type)}</p>{business.user_status === "suspended" && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">Suspended</span>}</div></div>
                </div>
                <div className="flex min-w-0 items-center gap-2 text-sm text-[#5E4A44]"><MapPin size={16} className="shrink-0 text-[#E85D3F]" /><span className="truncate">{business.area}</span></div>
                <div><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${business.delivery_enabled ? "bg-green-50 text-green-700" : "bg-[#FFF0E5] text-[#C9472E]"}`}>{business.delivery_enabled ? <Truck size={14} /> : <Store size={14} />}{business.delivery_enabled ? "Pickup & delivery" : "Pickup only"}</span></div>
                <div className="flex items-center gap-2 text-sm text-[#71605A]"><CalendarDays size={15} className="lg:hidden" />{new Date(business.created_at).toLocaleDateString()}</div>
                <button type="button" onClick={() => setSelected(business)} aria-label={`View ${business.business_name} details`} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#EEDFD3] text-sm font-semibold text-[#C9472E] transition hover:border-[#E85D3F] hover:bg-[#FFF0E5] lg:w-10"><Eye size={17} /><span className="lg:sr-only">View details</span></button>
              </article>
            ))}
          </div>
        </section>
      )}

      {selected && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:pl-72" role="presentation">
          <div className="absolute inset-0 bg-[#241815]/20 backdrop-blur-[2px]" onMouseDown={() => setSelected(null)} aria-hidden="true" />
          <section role="dialog" aria-modal="true" aria-labelledby="business-dialog-title" className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[#EEDFD3] bg-white shadow-[0_30px_90px_rgba(36,24,21,0.36)]">
            <header className="relative bg-[#3A2925] px-6 pb-6 pt-5 text-white">
              <button type="button" onClick={() => setSelected(null)} aria-label="Close business details" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition hover:bg-white/20"><X size={18} /></button>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFC247] text-lg font-bold text-[#3A2925]">{initials(selected.business_name)}</div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFC247]">Registered business</p>
              <h2 id="business-dialog-title" className="mt-1 pr-10 font-display text-2xl font-bold">{selected.business_name}</h2>
              <p className="mt-1 text-sm capitalize text-white/70">{formatType(selected.business_type)}</p>
            </header>
            <div className="space-y-4 p-6">
              {selected.user_status === "suspended" && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">This business account is suspended.</div>}
              <div className={`flex items-center gap-3 rounded-2xl p-4 ${selected.delivery_enabled ? "bg-green-50 text-green-800" : "bg-[#FFF0E5] text-[#9D432F]"}`}>
                {selected.delivery_enabled ? <Truck size={20} /> : <Store size={20} />}
                <div><p className="text-xs opacity-75">Fulfillment</p><p className="font-bold">{selected.delivery_enabled ? "Pickup and delivery available" : "Pickup only"}</p></div>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl border border-[#EEDFD3] p-4"><dt className="flex items-center gap-2 text-xs text-[#71605A]"><Phone size={14} />Phone</dt><dd className="mt-2 break-words font-semibold text-[#3A2925]">{selected.phone}</dd></div>
                <div className="rounded-2xl border border-[#EEDFD3] p-4"><dt className="flex items-center gap-2 text-xs text-[#71605A]"><MapPin size={14} />Area</dt><dd className="mt-2 font-semibold text-[#3A2925]">{selected.area}</dd></div>
                <div className="rounded-2xl border border-[#EEDFD3] p-4 sm:col-span-2"><dt className="text-xs text-[#71605A]">Full address</dt><dd className="mt-2 font-semibold leading-6 text-[#3A2925]">{selected.address}</dd></div>
                <div className="rounded-2xl border border-[#EEDFD3] p-4 sm:col-span-2"><dt className="flex items-center gap-2 text-xs text-[#71605A]"><CalendarDays size={14} />Registered</dt><dd className="mt-2 font-semibold text-[#3A2925]">{new Date(selected.created_at).toLocaleString()}</dd></div>
              </dl>
              <div className="flex justify-end border-t border-[#EEDFD3] pt-4">
                <button type="button" disabled={updatingId === selected.user_id} onClick={() => void changeAccountStatus(selected)} className={`rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60 ${selected.user_status === "suspended" ? "bg-[#E85D3F] text-white hover:bg-[#C9472E]" : "border border-red-200 text-red-700 hover:bg-red-50"}`}>
                  {updatingId === selected.user_id ? "Updating..." : selected.user_status === "suspended" ? "Reactivate account" : "Suspend account"}
                </button>
              </div>
            </div>
          </section>
        </div>, document.body
      )}
    </DashboardShell>
  );
}
