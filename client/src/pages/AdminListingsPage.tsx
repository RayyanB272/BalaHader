import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, Boxes, CircleCheck, Eye, PackageSearch, X } from "lucide-react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import BrandIcon from "../components/ui/BrandIcon";
import MetricCard from "../components/ui/MetricCard";
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
  const [selectedListing, setSelectedListing] = useState<AdminListing | null>(null);

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

  useEffect(() => {
    if (!selectedListing) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedListing(null);
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedListing]);

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
      setSelectedListing((current) =>
        current?._id === listing._id
          ? {
              ...current,
              status: "disabled",
              disabled_reason: reason,
              disabled_at: new Date().toISOString(),
            }
          : current
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Boxes size={21} />} label="All listings" value={listings.length} />
        <MetricCard icon={<CircleCheck size={21} />} label="Active" value={listings.filter((listing) => listing.status === "active").length} />
        <MetricCard icon={<Ban size={21} />} label="Disabled" value={listings.filter((listing) => listing.status === "disabled").length} />
        <MetricCard icon={<PackageSearch size={21} />} label="Other statuses" value={listings.filter((listing) => !["active", "disabled"].includes(listing.status)).length} />
      </div>
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
              <button
                type="button"
                key={listing._id}
                onClick={() => {
                  setSelectedListing(listing);
                  setActionError("");
                }}
                className="group overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/30"
              >
                <div className="relative">
                  {listing.image_url ? (
                    <img src={listing.image_url} alt="" className="h-44 w-full object-cover" />
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-[#FFF0E5]"><BrandIcon size="lg" /></div>
                  )}
                  <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold capitalize shadow-sm ${listing.status === "disabled" ? "bg-red-50 text-red-700" : "bg-white text-[#C9472E]"}`}>
                    {formatValue(listing.status)}
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#E85D3F]">{formatValue(listing.category)}</p>
                  <h2 className="mt-1 line-clamp-1 text-lg font-bold text-[#3A2925]">{listing.title}</h2>
                  <div className="mt-4 flex items-end justify-between gap-4 border-t border-[#EEDFD3] pt-4">
                    <div><p className="text-lg font-bold text-[#C9472E]">${listing.discounted_price.toFixed(2)}</p><p className="text-xs text-[#71605A]">{available} available</p></div>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-[#E85D3F]"><Eye size={16} /> View details</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedListing && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:pl-72">
          <div className="absolute inset-0 bg-[#241815]/15 backdrop-blur-sm" onMouseDown={() => setSelectedListing(null)} aria-hidden="true" />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="listing-dialog-title"
            style={{ width: "min(440px, calc(100vw - 2rem))", height: "min(440px, calc(100dvh - 2rem))" }}
            className="relative z-10 flex shrink-0 flex-col overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white p-3 shadow-[0_30px_90px_rgba(36,24,21,0.42)]"
          >
            <header className="flex items-center justify-between gap-3 px-1 pb-3">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-[#E85D3F]">Listing record</p><p className="mt-0.5 text-xs text-[#71605A]">#{selectedListing._id.slice(-8).toUpperCase()}</p></div>
              <button type="button" onClick={() => setSelectedListing(null)} aria-label="Close listing details" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EEDFD3] text-[#3A2925] hover:bg-[#FFF0E5]"><X size={18} /></button>
            </header>

            {selectedListing.image_url ? (
              <img src={selectedListing.image_url} alt="" className="h-16 w-full shrink-0 rounded-xl object-cover" />
            ) : (
              <div className="flex h-16 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E5]"><BrandIcon /></div>
            )}

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-1 pb-1 pr-2">
              <div className="flex items-start justify-between gap-3">
                <div><h2 id="listing-dialog-title" className="text-xl font-bold text-[#3A2925]">{selectedListing.title}</h2><p className="mt-1 text-sm capitalize text-[#71605A]">{formatValue(selectedListing.category)}</p></div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${selectedListing.status === "disabled" ? "bg-red-50 text-red-700" : "bg-[#FFF0E5] text-[#C9472E]"}`}>{formatValue(selectedListing.status)}</span>
              </div>

              {selectedListing.description && <p className="mt-3 text-sm leading-6 text-[#71605A]">{selectedListing.description}</p>}

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-[#FFF9EE] p-3 text-sm">
                <div><dt className="text-xs text-[#71605A]">Price</dt><dd className="mt-0.5 font-semibold text-[#3A2925]">${selectedListing.discounted_price.toFixed(2)}</dd></div>
                <div><dt className="text-xs text-[#71605A]">Available</dt><dd className="mt-0.5 font-semibold text-[#3A2925]">{Math.max(0, selectedListing.remaining_quantity - (selectedListing.reserved_quantity ?? 0))}</dd></div>
                <div><dt className="text-xs text-[#71605A]">Fulfillment</dt><dd className="mt-0.5 font-semibold capitalize text-[#3A2925]">{formatValue(selectedListing.fulfillment_type)}</dd></div>
                <div><dt className="text-xs text-[#71605A]">Created</dt><dd className="mt-0.5 font-semibold text-[#3A2925]">{new Date(selectedListing.created_at).toLocaleDateString()}</dd></div>
              </dl>

              {selectedListing.status === "disabled" ? (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"><p className="font-semibold">Disabled reason</p><p className="mt-1">{selectedListing.disabled_reason || "No reason provided."}</p></div>
              ) : (
                <div className="mt-3 rounded-xl border border-red-100 bg-red-50/50 p-3">
                  <label htmlFor={`reason-${selectedListing._id}`} className="block text-sm font-semibold text-[#3A2925]">Moderation reason</label>
                  <textarea id={`reason-${selectedListing._id}`} rows={2} maxLength={500} value={reasons[selectedListing._id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [selectedListing._id]: event.target.value }))} placeholder="Explain why this listing should be disabled." className="mt-2 w-full resize-none rounded-xl border border-[#EEDFD3] bg-white px-3 py-2 text-sm outline-none focus:border-[#E85D3F]" />
                  {actionError && <p className="mt-2 text-xs text-red-700">{actionError}</p>}
                  <button type="button" disabled={updatingId === selectedListing._id} onClick={() => void handleDisable(selectedListing)} className="mt-2 w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{updatingId === selectedListing._id ? "Disabling..." : "Disable listing"}</button>
                </div>
              )}
            </div>
          </section>
        </div>,
        document.body
      )}
    </DashboardShell>
  );
}
