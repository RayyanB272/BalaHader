import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import {
  getAdminDonations,
  type AdminDonation,
} from "../services/adminDonationService";

function formatValue(value: string) {
  return value.replaceAll("_", " ");
}

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<AdminDonation[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  async function loadDonations() {
    setLoading(true);
    setLoadError(false);

    try {
      setDonations(await getAdminDonations());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDonations();
  }, []);

  const availableStatuses = useMemo(
    () =>
      Array.from(
        new Set(
          donations.map((donation) => donation.status)
        )
      ),
    [donations]
  );

  const filteredDonations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return donations.filter((donation) => {
      const matchesStatus =
        statusFilter === "all" ||
        donation.status === statusFilter;

      const searchableText = [
        donation._id,
        donation.title,
        donation.category ?? "",
        donation.business_id,
        donation.charity_id ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [donations, search, statusFilter]);

  return (
    <DashboardShell
      role="admin"
      title="Donation management"
      description="Monitor donations as they move from businesses to charities."
    >
      <section className="grid gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4 sm:grid-cols-[1fr_220px]">
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search donations..."
          aria-label="Search donations"
          className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          aria-label="Filter donations by status"
          className="w-full rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm capitalize outline-none focus:border-[#E85D3F]"
        >
          <option value="all">All statuses</option>

          {availableStatuses.map((status) => (
            <option key={status} value={status}>
              {formatValue(status)}
            </option>
          ))}
        </select>
      </section>

      {loading ? (
        <LoadingSpinner />
      ) : loadError ? (
        <ErrorState
          message="We couldn't load the platform donations."
          onRetry={() => void loadDonations()}
        />
      ) : donations.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title="No donations found"
            description="Business donations will appear here."
          />
        </section>
      ) : filteredDonations.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title="No matching donations"
            description="Change the search text or status filter."
          />
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredDonations.map((donation) => (
            <article
              key={donation._id}
              className="rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#C9472E]">
                    Donation #{donation._id.slice(-8).toUpperCase()}
                  </p>

                  <h2 className="mt-2 text-lg font-bold text-[#3A2925]">
                    {donation.title}
                  </h2>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    donation.status === "completed"
                      ? "bg-[#FFF0E5] text-[#C9472E]"
                      : donation.status === "cancelled"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {formatValue(donation.status)}
                </span>
              </div>

              <dl className="mt-5 space-y-3 border-y border-[#EEDFD3] py-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#71605A]">
                    Quantity
                  </dt>
                  <dd className="font-semibold">
                    {donation.quantity}
                  </dd>
                </div>

                {donation.category && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#71605A]">
                      Category
                    </dt>
                    <dd className="font-semibold capitalize">
                      {formatValue(donation.category)}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-[#71605A]">
                    Business ID
                  </dt>
                  <dd className="mt-1 break-all font-semibold">
                    {donation.business_id}
                  </dd>
                </div>

                <div>
                  <dt className="text-[#71605A]">
                    Charity ID
                  </dt>
                  <dd className="mt-1 break-all font-semibold">
                    {donation.charity_id || "Not claimed"}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-[#71605A]">
                    Created
                  </dt>
                  <dd className="font-semibold">
                    {new Date(
                      donation.created_at
                    ).toLocaleDateString()}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 space-y-2 text-xs text-[#71605A]">
                {donation.claimed_at && (
                  <p>
                    Claimed:{" "}
                    {new Date(
                      donation.claimed_at
                    ).toLocaleString()}
                  </p>
                )}

                {donation.pickup_deadline && (
                  <p>
                    Pickup deadline:{" "}
                    {new Date(
                      donation.pickup_deadline
                    ).toLocaleString()}
                  </p>
                )}

                {donation.completed_at && (
                  <p>
                    Completed:{" "}
                    {new Date(
                      donation.completed_at
                    ).toLocaleString()}
                  </p>
                )}

                {donation.auto_generated && (
                  <p className="font-semibold text-[#C9472E]">
                    Automatically donated when unsold
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}