import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import {
  disableAdminListing,
  getAdminListings,
  type AdminListing,
} from "../services/adminListingService";

function formatValue(value: string) {
  return value.replaceAll("_", " ");
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadListings() {
    setLoading(true);
    setLoadError(false);

    try {
      setListings(await getAdminListings());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadListings();
  }, []);

  const availableStatuses = useMemo(
    () =>
      Array.from(
        new Set(listings.map((listing) => listing.status))
      ),
    [listings]
  );

  const filteredListings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return listings.filter((listing) => {
      const matchesStatus =
        statusFilter === "all" ||
        listing.status === statusFilter;

      const searchableText = [
        listing.title,
        listing.description ?? "",
        listing.category,
        listing.fulfillment_type,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [listings, search, statusFilter]);

  async function handleDisable(listing: AdminListing) {
    const reason = reasons[listing._id]?.trim() ?? "";

    if (reason.length < 3) {
      setActionError(
        "Enter a reason containing at least 3 characters."
      );
      return;
    }

    setUpdatingId(listing._id);
    setActionError("");

    try {
      await disableAdminListing(listing._id, reason);

      setListings((currentListings) =>
        currentListings.map((currentListing) =>
          currentListing._id === listing._id
            ? {
                ...currentListing,
                status: "disabled",
                disabled_reason: reason,
                disabled_at: new Date().toISOString(),
              }
            : currentListing
        )
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.detail;

        setActionError(
          typeof message === "string"
            ? message
            : "The listing could not be disabled."
        );
      } else {
        setActionError(
          "The listing could not be disabled."
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <DashboardShell
      role="admin"
      title="Listing moderation"
      description="Review marketplace listings and disable inappropriate content."
    >
      <section className="grid gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4 sm:grid-cols-[1fr_220px]">
        <div>
          <label
            htmlFor="listing-search"
            className="sr-only"
          >
            Search listings
          </label>

          <input
            id="listing-search"
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search listings..."
            className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"
          />
        </div>

        <div>
          <label
            htmlFor="status-filter"
            className="sr-only"
          >
            Filter by status
          </label>

          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="w-full rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm capitalize outline-none focus:border-[#E85D3F]"
          >
            <option value="all">All statuses</option>

            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {formatValue(status)}
              </option>
            ))}
          </select>
        </div>
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
          message="We couldn't load the platform listings."
          onRetry={() => void loadListings()}
        />
      ) : listings.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title="No listings found"
            description="Food listings will appear here."
          />
        </section>
      ) : filteredListings.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title="No matching listings"
            description="Change the search text or status filter."
          />
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredListings.map((listing) => {
            const available = Math.max(
              0,
              listing.remaining_quantity -
                (listing.reserved_quantity ?? 0)
            );

            return (
              <article
                key={listing._id}
                className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm"
              >
                {listing.image_url ? (
                  <img
                    src={listing.image_url}
                    alt={listing.title}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-[#FFF0E5] text-5xl">
                    🌿
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-[#3A2925]">
                        {listing.title}
                      </h2>

                      <p className="mt-1 text-sm capitalize text-[#71605A]">
                        {formatValue(listing.category)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        listing.status === "disabled"
                          ? "bg-red-50 text-red-700"
                          : "bg-[#FFF0E5] text-[#C9472E]"
                      }`}
                    >
                      {formatValue(listing.status)}
                    </span>
                  </div>

                  {listing.description && (
                    <p className="mt-4 line-clamp-3 text-sm text-[#71605A]">
                      {listing.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-xl font-bold text-[#C9472E]">
                      ${listing.discounted_price.toFixed(2)}
                    </span>

                    <span className="text-sm text-gray-400 line-through">
                      ${listing.original_price.toFixed(2)}
                    </span>
                  </div>

                  <dl className="mt-4 space-y-2 border-t border-[#EEDFD3] pt-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#71605A]">Available</dt>
                      <dd className="font-semibold">{available}</dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-[#71605A]">
                        Fulfillment
                      </dt>
                      <dd className="font-semibold capitalize">
                        {formatValue(listing.fulfillment_type)}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-[#71605A]">Created</dt>
                      <dd className="font-semibold">
                        {new Date(
                          listing.created_at
                        ).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>

                  {listing.status === "disabled" ? (
                    <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                      <p className="font-semibold">Disabled</p>
                      <p className="mt-1">
                        {listing.disabled_reason ||
                          "No reason provided."}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5">
                      <label
                        htmlFor={`reason-${listing._id}`}
                        className="block text-sm font-semibold text-[#3A2925]"
                      >
                        Moderation reason
                      </label>

                      <textarea
                        id={`reason-${listing._id}`}
                        rows={3}
                        maxLength={500}
                        value={reasons[listing._id] ?? ""}
                        onChange={(event) =>
                          setReasons((currentReasons) => ({
                            ...currentReasons,
                            [listing._id]: event.target.value,
                          }))
                        }
                        placeholder="Explain why this listing should be disabled."
                        className="mt-2 w-full resize-none rounded-xl border border-[#EEDFD3] px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"
                      />

                      <button
                        type="button"
                        disabled={updatingId === listing._id}
                        onClick={() =>
                          void handleDisable(listing)
                        }
                        className="mt-3 w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingId === listing._id
                          ? "Disabling..."
                          : "Disable listing"}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        
      )}
    </DashboardShell>
  );
}