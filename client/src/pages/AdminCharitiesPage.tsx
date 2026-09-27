import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from "lucide-react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import MetricCard from "../components/ui/MetricCard";
import {
  getAdminCharities,
  rejectCharity,
  verifyCharity,
  type AdminCharity,
} from "../services/adminCharityService";

export default function AdminCharitiesPage() {
  const [charities, setCharities] = useState<AdminCharity[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadCharities() {
    setLoading(true);
    setLoadError(false);

    try {
      setCharities(await getAdminCharities());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCharities();
  }, []);

  const filteredCharities = useMemo(() => {
    const query = search.trim().toLowerCase();
    return charities.filter((charity) => (statusFilter === "all" || charity.verification_status === statusFilter) && (!query || [charity.organization_name, charity.area, charity.phone, charity.address].join(" ").toLowerCase().includes(query)));
  }, [charities, search, statusFilter]);

  async function handleAction(
    charityId: string,
    action: "verify" | "reject"
  ) {
    const reason = reasons[charityId]?.trim() ?? "";

    if (reason.length < 3) {
      setActionError(
        "Enter a reason containing at least 3 characters."
      );
      return;
    }

    setUpdatingId(charityId);
    setActionError("");

    try {
      if (action === "verify") {
        await verifyCharity(charityId, reason);
      } else {
        await rejectCharity(charityId, reason);
      }

      setCharities((current) => current.map((charity) => charity._id === charityId ? {
        ...charity,
        verification_status: action === "verify" ? "verified" : "rejected",
        verification_reason: reason,
        verified_at: new Date().toISOString(),
      } : charity));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.detail;

        setActionError(
          typeof message === "string"
            ? message
            : "The charity status could not be updated."
        );
      } else {
        setActionError(
          "The charity status could not be updated."
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <DashboardShell
      role="admin"
      title="Charity verification"
      description="Review charity applications before allowing donation claims."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={<ShieldCheck size={21} />} label="All charities" value={charities.length} />
        <MetricCard icon={<Clock3 size={21} />} label="Pending review" value={charities.filter((charity) => charity.verification_status === "pending").length} />
        <MetricCard icon={<CheckCircle2 size={21} />} label="Verified" value={charities.filter((charity) => charity.verification_status === "verified").length} />
      </div>

      <section className="grid gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4 sm:grid-cols-[1fr_220px]">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search charities..." aria-label="Search charities" className="rounded-xl border border-[#EEDFD3] px-4 py-3 text-sm outline-none focus:border-[#E85D3F]" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter charities by verification status" className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm"><option value="all">All statuses</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select>
      </section>
      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : loadError ? (
        <ErrorState
          message="We couldn't load charity accounts."
          onRetry={() => void loadCharities()}
        />
      ) : filteredCharities.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title={charities.length ? "No matching charities" : "No charity accounts"}
            description={charities.length ? "Try another search or status." : "Registered charities will appear here."}
          />
        </section>
      ) : (
        <div className="space-y-5">
          {filteredCharities.map((charity) => (
            <article
              key={charity._id}
              className="rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-[#3A2925]">
                      {charity.organization_name}
                    </h2>

                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${charity.verification_status === "verified" ? "bg-green-100 text-green-800" : charity.verification_status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                      {charity.verification_status}
                    </span>
                  </div>

                  {charity.description && (
                    <p className="mt-3 text-sm leading-6 text-[#71605A]">
                      {charity.description}
                    </p>
                  )}

                  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[#71605A]">Phone</dt>
                      <dd className="mt-1 font-semibold text-[#3A2925]">
                        {charity.phone}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[#71605A]">Area</dt>
                      <dd className="mt-1 font-semibold text-[#3A2925]">
                        {charity.area}
                      </dd>
                    </div>

                    <div className="sm:col-span-2">
                      <dt className="text-[#71605A]">Address</dt>
                      <dd className="mt-1 font-semibold text-[#3A2925]">
                        {charity.address}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[#71605A]">
                        Application date
                      </dt>
                      <dd className="mt-1 font-semibold text-[#3A2925]">
                        {new Date(
                          charity.created_at
                        ).toLocaleString()}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[#71605A]">
                        Verification document
                      </dt>
                      <dd className="mt-1">
                        {charity.verification_document_url ? (
                          <a
                            href={charity.verification_document_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[#C9472E] underline"
                          >
                            View document
                          </a>
                        ) : (
                          <span className="text-amber-700">
                            No document provided
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                {charity.verification_status === "pending" ? <div className="w-full rounded-2xl bg-[#FFF9EE] p-4 lg:max-w-sm">
                  <label
                    htmlFor={`reason-${charity._id}`}
                    className="block text-sm font-semibold text-[#3A2925]"
                  >
                    Decision reason
                  </label>

                  <textarea
                    id={`reason-${charity._id}`}
                    rows={4}
                    maxLength={500}
                    value={reasons[charity._id] ?? ""}
                    onChange={(event) =>
                      setReasons((currentReasons) => ({
                        ...currentReasons,
                        [charity._id]: event.target.value,
                      }))
                    }
                    placeholder="Explain why this application is approved or rejected."
                    className="mt-2 w-full resize-none rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"
                  />

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <button
                      type="button"
                      disabled={updatingId === charity._id}
                      onClick={() =>
                        void handleAction(charity._id, "reject")
                      }
                      className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      disabled={updatingId === charity._id}
                      onClick={() =>
                        void handleAction(charity._id, "verify")
                      }
                      className="rounded-xl bg-[#E85D3F] px-4 py-3 text-sm font-semibold text-white hover:bg-[#C9472E] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingId === charity._id
                        ? "Updating..."
                        : "Verify"}
                    </button>
                  </div>
                </div> : <div className={`w-full rounded-2xl border p-5 lg:max-w-sm ${charity.verification_status === "verified" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                  <div className="flex items-center gap-2">{charity.verification_status === "verified" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}<h3 className="font-bold capitalize">{charity.verification_status}</h3></div>
                  <p className="mt-3 text-sm">{charity.verification_reason || (charity.verification_status === "verified" ? "This charity has been approved." : "This charity was not approved.")}</p>
                  {charity.verified_at && <p className="mt-3 text-xs opacity-75">Updated {new Date(charity.verified_at).toLocaleString()}</p>}
                </div>}
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
