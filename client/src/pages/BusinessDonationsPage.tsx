import { useEffect, useMemo, useState } from "react";
import ExpandableCard from "../components/ui/ExpandableCard";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import {
  getBusinessDonations,
  markDonationReady,
  type BusinessDonation,
} from "../services/businessDonationService";
import { Link } from "react-router-dom";

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default function BusinessDonationsPage() {
  const [donations, setDonations] = useState<BusinessDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filteredDonations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return donations.filter((donation) => (status === "all" || donation.status === status) && (!query || [donation.title, donation.category, donation._id].filter(Boolean).some((value) => String(value).toLowerCase().includes(query))));
  }, [donations, search, status]);

  async function loadDonations() {
    setLoading(true);
    setError(false);

    try {
      setDonations(await getBusinessDonations());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDonations();
  }, []);

  async function handleMarkReady(donationId: string) {
    setUpdatingId(donationId);
    setActionError("");

    try {
      await markDonationReady(donationId);

      setDonations((currentDonations) =>
        currentDonations.map((donation) =>
          donation._id === donationId
            ? {
              ...donation,
              status: "ready_for_pickup",
            }
            : donation
        )
      );
    } catch {
      setActionError(
        "The donation could not be marked as ready. It must be claimed first."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <DashboardShell
      role="business"
      title="Food donations"
      description="Track donated food and prepare claimed donations for pickup."
    >
      <section className="grid gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4 sm:grid-cols-[1fr_220px]">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search donations..." className="rounded-xl border border-[#EEDFD3] px-4 py-2.5 text-sm outline-none focus:border-[#E85D3F]" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-2.5 text-sm"><option value="all">All statuses</option><option value="available">Available</option><option value="claimed">Claimed</option><option value="ready_for_pickup">Ready for pickup</option><option value="completed">Completed</option><option value="expired">Expired</option></select>
      </section>
      <div className="flex justify-end">
        <Link
          to="/business/donations/new"
          className="rounded-xl bg-[#E85D3F] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C9472E]"
        >
          Create donation
        </Link>
      </div>
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
      ) : error ? (
        <ErrorState
          message="We couldn't load your donations."
          onRetry={() => void loadDonations()}
        />
      ) : filteredDonations.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title={donations.length ? "No matching donations" : "No donations yet"}
            description={donations.length ? "Try another search or status." : "Donations created from your food listings will appear here."}
          />
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredDonations.map((donation) => (
            <ExpandableCard
              key={donation._id}
              header={
              <div>
              {donation.image_url ? (
                <img src={donation.image_url} alt={donation.title} className="mb-4 h-40 w-full rounded-xl object-cover" />
              ) : (
                <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-[#FFF0E5] text-4xl">🍲</div>
              )}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#C9472E]">
                    Donation #{donation._id.slice(-8).toUpperCase()}
                  </p>

                  <h2 className="mt-2 text-lg font-bold text-[#3A2925]">
                    {donation.title}
                  </h2>
                  <p className="mt-1 text-sm text-[#71605A]">Quantity: {donation.quantity}</p>
                </div>

                <span className="rounded-full bg-[#FFF0E5] px-3 py-1 text-xs font-semibold capitalize text-[#C9472E]">
                  {formatStatus(donation.status)}
                </span>
              </div>
              </div>
              }
              details={
              <div className="space-y-2">
                <p className="text-[#71605A]">
                  Quantity:{" "}
                  <span className="font-semibold text-[#3A2925]">
                    {donation.quantity}
                  </span>
                </p>

                {donation.category && (
                  <p className="capitalize text-[#71605A]">
                    Category:{" "}
                    <span className="font-semibold text-[#3A2925]">
                      {formatStatus(donation.category)}
                    </span>
                  </p>
                )}

                <p className="text-[#71605A]">
                  Created:{" "}
                  <span className="font-semibold text-[#3A2925]">
                    {new Date(
                      donation.created_at
                    ).toLocaleString()}
                  </span>
                </p>

                {donation.pickup_deadline && (
                  <p className="text-[#71605A]">
                    Pickup deadline:{" "}
                    <span className="font-semibold text-[#3A2925]">
                      {new Date(
                        donation.pickup_deadline
                      ).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>

              }
            >

              {donation.status === "claimed" && (
                <button
                  type="button"
                  disabled={updatingId === donation._id}
                  onClick={() =>
                    void handleMarkReady(donation._id)
                  }
                  className="mt-5 w-full rounded-xl bg-[#E85D3F] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C9472E] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingId === donation._id
                    ? "Updating..."
                    : "Mark ready for pickup"}
                </button>
              )}
            </ExpandableCard>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
