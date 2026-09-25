import axios from "axios";
import ExpandableCard from "../components/ui/ExpandableCard";
import { useEffect, useState } from "react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import {
  collectDonation,
  getMyClaimedDonations,
  type CharityDonation,
} from "../services/charityDonationService";
import ReviewForm from "../components/ReviewForm";

function formatValue(value: string) {
  return value.replaceAll("_", " ");
}

export default function CharityClaimsPage() {
  const [donations, setDonations] = useState<CharityDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [collectingId, setCollectingId] = useState<string | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredDonations = donations.filter(
    (donation) => statusFilter === "all" || donation.status === statusFilter
  );

  async function loadDonations() {
    setLoading(true);
    setLoadError(false);

    try {
      setDonations(await getMyClaimedDonations());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDonations();
  }, []);

  async function handleCollect(donationId: string) {
    setCollectingId(donationId);
    setActionError("");

    try {
      await collectDonation(donationId);

      setDonations((currentDonations) =>
        currentDonations.map((donation) =>
          donation._id === donationId
            ? {
                ...donation,
                status: "completed",
                collected_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
              }
            : donation
        )
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.detail;

        setActionError(
          typeof message === "string"
            ? message
            : "The donation could not be marked as collected."
        );
      } else {
        setActionError(
          "The donation could not be marked as collected."
        );
      }
    } finally {
      setCollectingId(null);
    }
  }

  return (
    <DashboardShell
      role="charity"
      title="My donation claims"
      description="Follow claimed donations and confirm completed pickups."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4">
        <p className="text-sm font-medium text-[#71605A]">Filter donation claims</p>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-2 text-sm text-[#3A2925]">
          <option value="all">All statuses</option>
          <option value="claimed">Claimed</option>
          <option value="ready_for_pickup">Ready for pickup</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
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
      ) : loadError ? (
        <ErrorState
          message="We couldn't load your donation claims."
          onRetry={() => void loadDonations()}
        />
      ) : filteredDonations.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title="No claimed donations"
            description={donations.length === 0 ? "Donations you claim will appear here." : "No claims match this filter."}
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
                    Claim #{donation._id.slice(-8).toUpperCase()}
                  </p>

                  <h2 className="mt-2 text-lg font-bold text-[#3A2925]">
                    {donation.title}
                  </h2>
                  <p className="mt-1 text-sm text-[#71605A]">Quantity: {donation.quantity}</p>
                </div>

                <span className="rounded-full bg-[#FFF0E5] px-3 py-1 text-xs font-semibold capitalize text-[#C9472E]">
                  {formatValue(donation.status)}
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
                      {formatValue(donation.category)}
                    </span>
                  </p>
                )}

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

                {donation.claimed_at && (
                  <p className="text-[#71605A]">
                    Claimed:{" "}
                    <span className="font-semibold text-[#3A2925]">
                      {new Date(
                        donation.claimed_at
                      ).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>

              }
            >

              {donation.status === "claimed" && (
                <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Waiting for the business to prepare this donation.
                </p>
              )}

              {donation.status === "ready_for_pickup" && (
                <button
                  type="button"
                  disabled={collectingId === donation._id}
                  onClick={() =>
                    void handleCollect(donation._id)
                  }
                  className="mt-5 w-full rounded-xl bg-[#E85D3F] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C9472E] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {collectingId === donation._id
                    ? "Updating..."
                    : "Confirm collection"}
                </button>
              )}

              {donation.status === "completed" && (
                <>
                  <p className="mt-5 rounded-xl bg-[#FFF0E5] px-4 py-3 text-sm font-medium text-[#C9472E]">This donation has been collected.</p>
                  <ReviewForm target="donation" targetId={donation._id} />
                </>
              )}
            </ExpandableCard>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
