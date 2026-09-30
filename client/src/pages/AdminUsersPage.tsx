import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, CheckCircle2, Eye, Mail, Phone, Search, Shield, UserRound, UsersRound, X, XCircle } from "lucide-react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import MetricCard from "../components/ui/MetricCard";
import { getAdminUsers, updateAdminUserStatus, type AdminUser, type UserRole } from "../services/adminUserService";

type RoleFilter = "all" | UserRole;
const formatValue = (value: string) => value.replaceAll("_", " ");
const initials = (user: AdminUser) => `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true); setLoadError(false);
    try { setUsers(await getAdminUsers()); } catch { setLoadError(true); } finally { setLoading(false); }
  }
  useEffect(() => { void loadUsers(); }, []);
  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    const previous = document.body.style.overflow;
    document.addEventListener("keydown", close); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = previous; };
  }, [selected]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) =>
      (roleFilter === "all" || user.role === roleFilter) &&
      (statusFilter === "all" || user.status === statusFilter) &&
      (!query || [user.first_name, user.last_name, user.email, user.phone ?? ""].join(" ").toLowerCase().includes(query))
    );
  }, [users, search, roleFilter, statusFilter]);
  const hasFilters = Boolean(search.trim()) || roleFilter !== "all" || statusFilter !== "all";

  async function changeStatus(user: AdminUser) {
    if (user.role === "admin") return;
    const nextStatus = user.status === "active" ? "suspended" : "active";
    setUpdatingId(user._id); setActionError("");
    try {
      await updateAdminUserStatus(user._id, nextStatus);
      setUsers((current) => current.map((item) => item._id === user._id ? { ...item, status: nextStatus } : item));
      setSelected((current) => current?._id === user._id ? { ...current, status: nextStatus } : current);
    } catch (error) {
      setActionError(axios.isAxiosError(error) && typeof error.response?.data?.detail === "string" ? error.response.data.detail : "The account status could not be updated.");
    } finally { setUpdatingId(null); }
  }

  return (
    <DashboardShell role="admin" title="User management" description="Browse platform accounts and manage access from one place.">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={<UsersRound size={21} />} label="All accounts" value={users.length} />
        <MetricCard icon={<CheckCircle2 size={21} />} label="Active" value={users.filter((user) => user.status === "active").length} />
        <MetricCard icon={<XCircle size={21} />} label="Suspended" value={users.filter((user) => user.status === "suspended").length} />
      </div>

      <section className="rounded-2xl border border-[#EEDFD3] bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_220px_190px]">
          <label className="relative block"><span className="sr-only">Search users</span><Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A58D85]" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or phone..." className="w-full rounded-xl border border-[#EEDFD3] py-3 pl-11 pr-4 text-sm outline-none focus:border-[#E85D3F] focus:ring-2 focus:ring-[#E85D3F]/10" /></label>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)} aria-label="Filter by role" className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"><option value="all">All roles</option><option value="customer">Customers</option><option value="business">Businesses</option><option value="charity">Charities</option><option value="admin">Administrators</option></select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by account status" className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-[#71605A]"><span>{filtered.length} {filtered.length === 1 ? "account" : "accounts"} shown</span>{hasFilters && <button type="button" onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); }} className="font-semibold text-[#C9472E] hover:underline">Clear filters</button>}</div>
      </section>
      {actionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>}

      {loading ? <LoadingSpinner /> : loadError ? <ErrorState message="We couldn't load the platform users." onRetry={() => void loadUsers()} /> : filtered.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white"><EmptyState title={users.length ? "No matching users" : "No users found"} description={users.length ? "Change the search text or filters." : "Registered accounts will appear here."} /></section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(260px,1.5fr)_1fr_1fr_150px_52px] gap-5 border-b border-[#EEDFD3] bg-[#FFF4E9] px-6 py-3 text-xs font-bold uppercase tracking-wide text-[#8D655A] lg:grid"><span>User</span><span>Role</span><span>Status</span><span>Registered</span><span className="sr-only">Details</span></div>
          <div className="divide-y divide-[#EEDFD3]">{filtered.map((user) => (
            <article key={user._id} className="grid gap-4 p-5 transition hover:bg-[#FFFCF8] lg:grid-cols-[minmax(260px,1.5fr)_1fr_1fr_150px_52px] lg:items-center lg:gap-5 lg:px-6">
              <div className="flex min-w-0 items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3A2925] text-sm font-bold text-[#FFC247]">{initials(user) || <UserRound size={20} />}</div><div className="min-w-0"><h2 className="truncate font-bold text-[#3A2925]">{user.first_name} {user.last_name}</h2><p className="mt-1 truncate text-xs text-[#71605A]">{user.email}</p></div></div>
              <span className="text-sm capitalize text-[#5E4A44]">{formatValue(user.role)}</span>
              <div><span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${user.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{user.status}</span></div>
              <div className="flex items-center gap-2 text-sm text-[#71605A]"><CalendarDays size={15} className="lg:hidden" />{new Date(user.created_at).toLocaleDateString()}</div>
              <button type="button" onClick={() => setSelected(user)} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#EEDFD3] text-sm font-semibold text-[#C9472E] hover:border-[#E85D3F] hover:bg-[#FFF0E5] lg:w-10" aria-label={`View ${user.first_name} ${user.last_name}`}><Eye size={17} /><span className="lg:sr-only">View details</span></button>
            </article>
          ))}</div>
        </section>
      )}

      {selected && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:pl-72" role="presentation">
        <div className="absolute inset-0 bg-[#241815]/20 backdrop-blur-[2px]" onMouseDown={() => setSelected(null)} />
        <section role="dialog" aria-modal="true" aria-labelledby="user-dialog-title" className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[#EEDFD3] bg-white shadow-[0_30px_90px_rgba(36,24,21,0.36)]">
          <header className="relative bg-[#3A2925] px-6 pb-6 pt-5 text-white"><button type="button" onClick={() => setSelected(null)} aria-label="Close user details" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 hover:bg-white/20"><X size={18} /></button><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFC247] text-lg font-bold text-[#3A2925]">{initials(selected)}</div><p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFC247]">{formatValue(selected.role)} account</p><h2 id="user-dialog-title" className="mt-1 pr-10 font-display text-2xl font-bold">{selected.first_name} {selected.last_name}</h2></header>
          <div className="space-y-4 p-6">
            <div className={`flex items-center gap-3 rounded-2xl p-4 ${selected.status === "active" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{selected.status === "active" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}<div><p className="text-xs opacity-75">Account status</p><p className="font-bold capitalize">{selected.status}</p></div></div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-2xl border border-[#EEDFD3] p-4 sm:col-span-2"><dt className="flex items-center gap-2 text-xs text-[#71605A]"><Mail size={14} />Email</dt><dd className="mt-2 break-all font-semibold text-[#3A2925]">{selected.email}</dd></div><div className="rounded-2xl border border-[#EEDFD3] p-4"><dt className="flex items-center gap-2 text-xs text-[#71605A]"><Phone size={14} />Phone</dt><dd className="mt-2 font-semibold text-[#3A2925]">{selected.phone || "Not provided"}</dd></div><div className="rounded-2xl border border-[#EEDFD3] p-4"><dt className="flex items-center gap-2 text-xs text-[#71605A]"><Shield size={14} />Role</dt><dd className="mt-2 font-semibold capitalize text-[#3A2925]">{formatValue(selected.role)}</dd></div><div className="rounded-2xl border border-[#EEDFD3] p-4 sm:col-span-2"><dt className="flex items-center gap-2 text-xs text-[#71605A]"><CalendarDays size={14} />Registered</dt><dd className="mt-2 font-semibold text-[#3A2925]">{new Date(selected.created_at).toLocaleString()}</dd></div></dl>
            <div className="flex justify-end border-t border-[#EEDFD3] pt-4">{selected.role === "admin" ? <span className="rounded-xl bg-[#FFF9EE] px-4 py-3 text-sm font-semibold text-[#71605A]">Administrator account protected</span> : <button type="button" disabled={updatingId === selected._id} onClick={() => void changeStatus(selected)} className={`rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60 ${selected.status === "suspended" ? "bg-[#E85D3F] text-white hover:bg-[#C9472E]" : "border border-red-200 text-red-700 hover:bg-red-50"}`}>{updatingId === selected._id ? "Updating..." : selected.status === "suspended" ? "Reactivate account" : "Suspend account"}</button>}</div>
          </div>
        </section>
      </div>, document.body)}
    </DashboardShell>
  );
}
