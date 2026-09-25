import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import {
  getBusinessListings,
  type BusinessListing,
} from "../services/businessListingService";
import { createDonation } from "../services/businessDonationService";

export default function CreateBusinessDonationPage() {
  const navigate = useNavigate();

  const [listings, setListings] = useState<BusinessListing[]>([]);
  const [listingId, setListingId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadListings() {
    setLoading(true);
    setLoadError(false);

    try {
      const result = await getBusinessListings();

      const availableListings = result.filter((listing) => {
        const available =
          listing.remaining_quantity -
          (listing.reserved_quantity ?? 0);

        return available > 0;
      });

      setListings(availableListings);

      if (availableListings.length > 0) {
        setListingId(availableListings[0]._id);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadListings();
  }, []);

  const selectedListing = listings.find(
    (listing) => listing._id === listingId
  );

  const availableQuantity = selectedListing
    ? Math.max(
        0,
        selectedListing.remaining_quantity -
          (selectedListing.reserved_quantity ?? 0)
      )
    : 0;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSubmitError("");

    if (!listingId) {
      setSubmitError("Choose a food listing.");
      return;
    }

    if (quantity < 1 || quantity > availableQuantity) {
      setSubmitError(
        `Quantity must be between 1 and ${availableQuantity}.`
      );
      return;
    }

    setSubmitting(true);

    try {
      await createDonation({
        listing_id: listingId,
        quantity,
      });

      navigate("/business/donations", {
        replace: true,
      });
    } catch {
      setSubmitError(
        "The donation could not be created. Check the quantity and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell
      role="business"
      title="Create a donation"
      description="Donate available surplus food to a verified charity."
    >
      {loading ? (
        <LoadingSpinner />
      ) : loadError ? (
        <ErrorState
          message="We couldn't load your available listings."
          onRetry={() => void loadListings()}
        />
      ) : listings.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title="No food is available to donate"
            description="Create a listing or make sure an existing listing has unreserved stock."
          />
        </section>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl space-y-6 rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm"
        >
          {submitError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {submitError}
            </div>
          )}

          <div>
            <label
              htmlFor="listing"
              className="mb-2 block text-sm font-semibold text-[#3A2925]"
            >
              Food listing
            </label>

            <select
              id="listing"
              value={listingId}
              onChange={(event) => {
                setListingId(event.target.value);
                setQuantity(1);
              }}
              className="w-full rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-[#3A2925] outline-none focus:border-[#E85D3F]"
            >
              {listings.map((listing) => {
                const available = Math.max(
                  0,
                  listing.remaining_quantity -
                    (listing.reserved_quantity ?? 0)
                );

                return (
                  <option
                    key={listing._id}
                    value={listing._id}
                  >
                    {listing.title} — {available} available
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label
              htmlFor="quantity"
              className="mb-2 block text-sm font-semibold text-[#3A2925]"
            >
              Quantity to donate
            </label>

            <input
              id="quantity"
              type="number"
              min={1}
              max={availableQuantity}
              value={quantity}
              onChange={(event) =>
                setQuantity(Number(event.target.value))
              }
              className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 text-[#3A2925] outline-none focus:border-[#E85D3F]"
              required
            />

            <p className="mt-2 text-sm text-[#71605A]">
              Maximum available: {availableQuantity}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/business/donations")}
              className="rounded-xl border border-[#EEDFD3] px-5 py-3 text-sm font-semibold text-[#3A2925]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#E85D3F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#C9472E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create donation"}
            </button>
          </div>
        </form>
      )}
    </DashboardShell>
  );
}