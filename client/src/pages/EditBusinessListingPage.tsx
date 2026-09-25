import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import {
  getBusinessListings,
  updateBusinessListing,
  type FulfillmentType,
  type ListingCategory,
} from "../services/businessListingService";
import { uploadFoodImage } from "../services/uploadService";

const categories: Array<{
  value: ListingCategory;
  label: string;
}> = [
  { value: "bakery", label: "Bakery" },
  { value: "prepared_meals", label: "Prepared Meals" },
  { value: "fresh_produce", label: "Fresh Produce" },
  { value: "dairy", label: "Dairy" },
  { value: "drinks", label: "Drinks" },
  { value: "desserts", label: "Desserts" },
  { value: "snacks", label: "Snacks" },
  { value: "other", label: "Other" },
];

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

export default function EditBusinessListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "prepared_meals" as ListingCategory,
    originalPrice: "",
    discountedPrice: "",
    quantity: "",
    saleDeadline: "",
    pickupDeadline: "",
    fulfillmentType: "pickup" as FulfillmentType,
    donateIfUnsold: true,
    donationEligible: true,
    imageUrl: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadListing() {
      if (!id) {
        setLoadError(true);
        setLoading(false);
        return;
      }

      try {
        const listings = await getBusinessListings();
        const listing = listings.find(
          (currentListing) => currentListing._id === id
        );

        if (!listing || listing.status === "disabled") {
          setLoadError(true);
          return;
        }

        setForm({
          title: listing.title,
          description: listing.description ?? "",
          category: listing.category,
          originalPrice: String(listing.original_price),
          discountedPrice: String(
            listing.discounted_price
          ),
          quantity: String(listing.original_quantity),
          saleDeadline: toLocalDateTimeInput(
            listing.sale_deadline
          ),
          pickupDeadline: toLocalDateTimeInput(
            listing.pickup_deadline
          ),
          fulfillmentType: listing.fulfillment_type,
          donateIfUnsold: listing.donate_if_unsold,
          donationEligible: listing.donation_eligible,
          imageUrl: listing.image_url ?? "",
        });

        setImagePreview(listing.image_url ?? "");
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }

    void loadListing();
  }, [id]);

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    setError("");

    if (!file) {
      setImageFile(null);
      setImagePreview(form.imageUrl);
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The image must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    setImageFile(file);

    const reader = new FileReader();

    reader.onload = () => {
      setImagePreview(
        typeof reader.result === "string"
          ? reader.result
          : form.imageUrl
      );
    };

    reader.readAsDataURL(file);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!id) {
      setError("The listing ID is missing.");
      return;
    }

    const originalPrice = Number(form.originalPrice);
    const discountedPrice = Number(form.discountedPrice);
    const quantity = Number(form.quantity);

    if (
      originalPrice <= 0 ||
      discountedPrice <= 0 ||
      quantity <= 0
    ) {
      setError(
        "Prices and quantity must be greater than zero."
      );
      return;
    }

    if (discountedPrice >= originalPrice) {
      setError(
        "The discounted price must be lower than the original price."
      );
      return;
    }

    if (
      new Date(form.pickupDeadline) <=
      new Date(form.saleDeadline)
    ) {
      setError(
        "The pickup deadline must be after the sale deadline."
      );
      return;
    }

    setSaving(true);

    try {
      let imageUrl = form.imageUrl || undefined;

      if (imageFile) {
        const uploadResult =
          await uploadFoodImage(imageFile);

        imageUrl = uploadResult.image_url;
      }

      await updateBusinessListing(id, {
        title: form.title.trim(),
        description:
          form.description.trim() || undefined,
        category: form.category,
        original_price: originalPrice,
        discounted_price: discountedPrice,
        quantity,
        sale_deadline: new Date(
          form.saleDeadline
        ).toISOString(),
        pickup_deadline: new Date(
          form.pickupDeadline
        ).toISOString(),
        fulfillment_type: form.fulfillmentType,
        donate_if_unsold: form.donateIfUnsold,
        donation_eligible: form.donationEligible,
        image_url: imageUrl,
      });

      navigate("/business/listings", {
        replace: true,
      });
    } catch (cause) {
      if (isAxiosError(cause)) {
        const detail = cause.response?.data?.detail;

        setError(
          typeof detail === "string"
            ? detail
            : "The listing could not be updated."
        );
      } else {
        setError(
          "The listing could not be updated."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm outline-none focus:border-[#E85D3F] focus:ring-2 focus:ring-[#E85D3F]/10";

  return (
    <DashboardShell
      role="business"
      title="Edit listing"
      description="Update the food listing while preserving its existing orders."
    >
      {loading ? (
        <LoadingSpinner />
      ) : loadError ? (
        <ErrorState message="This listing could not be loaded or edited." />
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Listing title
            </label>

            <input
              required
              value={form.title}
              onChange={(event) =>
                setForm({
                  ...form,
                  title: event.target.value,
                })
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Description
            </label>

            <textarea
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm({
                  ...form,
                  description: event.target.value,
                })
              }
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Category
              </span>

              <select
                value={form.category}
                onChange={(event) =>
                  setForm({
                    ...form,
                    category:
                      event.target.value as ListingCategory,
                  })
                }
                className={inputClass}
              >
                {categories.map((category) => (
                  <option
                    key={category.value}
                    value={category.value}
                  >
                    {category.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Total quantity
              </span>

              <input
                required
                type="number"
                min={1}
                value={form.quantity}
                onChange={(event) =>
                  setForm({
                    ...form,
                    quantity: event.target.value,
                  })
                }
                className={inputClass}
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Original price
              </span>

              <input
                required
                type="number"
                min={0.01}
                step={0.01}
                value={form.originalPrice}
                onChange={(event) =>
                  setForm({
                    ...form,
                    originalPrice: event.target.value,
                  })
                }
                className={inputClass}
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Discounted price
              </span>

              <input
                required
                type="number"
                min={0.01}
                step={0.01}
                value={form.discountedPrice}
                onChange={(event) =>
                  setForm({
                    ...form,
                    discountedPrice: event.target.value,
                  })
                }
                className={inputClass}
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Sale deadline
              </span>

              <input
                required
                type="datetime-local"
                value={form.saleDeadline}
                onChange={(event) =>
                  setForm({
                    ...form,
                    saleDeadline: event.target.value,
                  })
                }
                className={inputClass}
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Pickup deadline
              </span>

              <input
                required
                type="datetime-local"
                value={form.pickupDeadline}
                onChange={(event) =>
                  setForm({
                    ...form,
                    pickupDeadline: event.target.value,
                  })
                }
                className={inputClass}
              />
            </label>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Fulfillment
            </label>

            <select
              value={form.fulfillmentType}
              onChange={(event) =>
                setForm({
                  ...form,
                  fulfillmentType:
                    event.target.value as FulfillmentType,
                })
              }
              className={inputClass}
            >
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
              <option value="both">
                Pickup and delivery
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Replace food image
            </label>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="block w-full rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm"
            />

            {imagePreview && (
              <img
                src={imagePreview}
                alt="Listing preview"
                className="mt-4 h-64 w-full rounded-2xl object-cover"
              />
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.donateIfUnsold}
                onChange={(event) =>
                  setForm({
                    ...form,
                    donateIfUnsold:
                      event.target.checked,
                  })
                }
              />
              Donate this food if it remains unsold
            </label>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.donationEligible}
                onChange={(event) =>
                  setForm({
                    ...form,
                    donationEligible:
                      event.target.checked,
                  })
                }
              />
              This listing is eligible for donation
            </label>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <Link
              to="/business/listings"
              className="rounded-xl border border-[#EEDFD3] px-5 py-3 font-semibold"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#E85D3F] px-5 py-3 font-semibold text-white hover:bg-[#C9472E] disabled:opacity-60"
            >
              {saving
                ? imageFile
                  ? "Uploading and saving..."
                  : "Saving..."
                : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </DashboardShell>
  );
}