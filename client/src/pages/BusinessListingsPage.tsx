import { useEffect, useMemo, useState } from "react";
import ExpandableCard from "../components/ui/ExpandableCard";
import { Link } from "react-router-dom";
import BrandIcon from "../components/ui/BrandIcon";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import {
  disableBusinessListing,
  getBusinessListings,
  type BusinessListing,
} from "../services/businessListingService";
import { isAxiosError } from "axios";

export default function BusinessListingsPage() {
  const [listings, setListings] = useState<BusinessListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [disableFormId, setDisableFormId] =
    useState<string | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [disablingId, setDisablingId] =
    useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return listings.filter((listing) => (status === "all" || listing.status === status) && (!query || [listing.title, listing.category].some((value) => String(value ?? "").toLowerCase().includes(query))));
  }, [listings, search, status]);

  async function loadListings() {
    setLoading(true);
    setError(false);

    try {
      setListings(await getBusinessListings());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadListings();
  }, []);

  async function handleDisable(listingId: string) {
    const reason = disableReason.trim();

    if (reason.length < 3) {
      setActionError(
        "Enter a reason containing at least 3 characters."
      );
      return;
    }

    setDisablingId(listingId);
    setActionError("");

    try {
      await disableBusinessListing(listingId, reason);

      setListings((currentListings) =>
        currentListings.map((listing) =>
          listing._id === listingId
            ? {
              ...listing,
              status: "disabled",
              disabled_reason: reason,
              disabled_at: new Date().toISOString(),
            }
            : listing
        )
      );

      setDisableFormId(null);
      setDisableReason("");
    } catch (cause) {
      if (isAxiosError(cause)) {
        const detail = cause.response?.data?.detail;

        setActionError(
          typeof detail === "string"
            ? detail
            : "The listing could not be disabled."
        );
      } else {
        setActionError(
          "The listing could not be disabled."
        );
      }
    } finally {
      setDisablingId(null);
    }
  }

  return (
    <DashboardShell
      role="business"
      title="Food listings"
      description="Manage the surplus food published by your business."
    >
      <section className="grid gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4 sm:grid-cols-[1fr_220px]">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search listings..." className="rounded-xl border border-[#EEDFD3] px-4 py-2.5 text-sm outline-none focus:border-[#E85D3F]" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-2.5 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="sold_out">Sold out</option><option value="expired">Expired</option><option value="disabled">Disabled</option></select>
      </section>
      <div className="mb-6 flex justify-end">
        <Link
          to="/business/listings/new"
          className="rounded-xl bg-[#E85D3F] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C9472E]"
        >
          Create listing
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
          message="We couldn't load your business listings."
          onRetry={() => void loadListings()}
        />
      ) : filteredListings.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title={listings.length ? "No matching listings" : "No listings yet"}
            description={listings.length ? "Try another search or status." : "Create your first surplus food listing."}
          />
        </section>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredListings.map((listing) => {
            const available = Math.max(
              0,
              listing.remaining_quantity -
              (listing.reserved_quantity ?? 0)
            );

            return (
              <ExpandableCard
                key={listing._id}
                media={
                listing.image_url ? (
                  <img
                    src={listing.image_url}
                    alt={listing.title}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-[#FFF0E5]">
                    <BrandIcon size="lg" />
                  </div>
                )
                }
                header={
<>
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[#FFF0E5] px-3 py-1 text-xs font-semibold capitalize text-[#C9472E]">
                      {listing.status}
                    </span>

                    <span className="text-xs text-[#71605A]">
                      {available} available
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-[#3A2925]">
                    {listing.title}
                  </h2>

                  <p className="mt-1 text-sm capitalize text-[#71605A]">
                    {listing.category.replaceAll("_", " ")}
                  </p>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-xl font-bold text-[#C9472E]">
                      ${listing.discounted_price.toFixed(2)}
                    </span>

                    <span className="text-sm text-gray-400 line-through">
                      ${listing.original_price.toFixed(2)}
                    </span>
                  </div>
</>
                }
                details={
                  <div className="space-y-1 text-[#71605A]">
                    <p>Sold: {listing.quantity_sold}</p>

                    <p className="mt-1 capitalize">
                      Fulfillment:{" "}
                      {listing.fulfillment_type.replaceAll("_", " ")}
                    </p>
                  </div>

                }
              >
                  {listing.status === "disabled" ? (
                    <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                      <p className="font-semibold">Listing disabled</p>
                      <p className="mt-1">
                        {listing.disabled_reason || "No reason provided."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <Link
                          to={`/business/listings/${listing._id}/edit`}
                          className="rounded-xl border border-[#E85D3F] px-4 py-2 text-center text-sm font-semibold text-[#C9472E] hover:bg-[#FFF0E5]"
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setDisableFormId(listing._id);
                            setDisableReason("");
                            setActionError("");
                          }}
                          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                          Disable
                        </button>
                      </div>

                      {disableFormId === listing._id && (
                        <div className="mt-4 rounded-xl bg-red-50 p-4">
                          <label
                            htmlFor={`disable-reason-${listing._id}`}
                            className="block text-sm font-semibold text-red-800"
                          >
                            Why are you disabling this listing?
                          </label>

                          <textarea
                            id={`disable-reason-${listing._id}`}
                            rows={3}
                            maxLength={500}
                            value={disableReason}
                            onChange={(event) =>
                              setDisableReason(event.target.value)
                            }
                            className="mt-2 w-full resize-none rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-500"
                          />

                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setDisableFormId(null);
                                setDisableReason("");
                              }}
                              className="rounded-lg border border-[#EEDFD3] bg-white px-3 py-2 text-sm font-semibold"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              disabled={disablingId === listing._id}
                              onClick={() =>
                                void handleDisable(listing._id)
                              }
                              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            >
                              {disablingId === listing._id
                                ? "Disabling..."
                                : "Confirm disable"}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
</ExpandableCard>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
