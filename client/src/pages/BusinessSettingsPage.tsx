import axios from "axios";
import { useEffect, useState } from "react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import {
  createBusinessDeliveryArea,
  getBusinessDeliveryAreas,
  getBusinessProfile,
  updateBusinessProfile,
  type BusinessProfile,
  type DeliveryArea,
} from "../services/businessSettingsService";

export default function BusinessSettingsPage() {
  const [profile, setProfile] =
    useState<BusinessProfile | null>(null);

  const [profileForm, setProfileForm] = useState({
    businessName: "",
    businessType: "",
    description: "",
    phone: "",
    address: "",
    area: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [deliveryAreas, setDeliveryAreas] = useState<
    DeliveryArea[]
  >([]);

  const [areaCode, setAreaCode] = useState("");
  const [areaName, setAreaName] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [estimatedMinutes, setEstimatedMinutes] =
    useState(30);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadSettings() {
    setLoading(true);
    setLoadError(false);

    try {
      const [profileResult, areasResult] =
        await Promise.all([
          getBusinessProfile(),
          getBusinessDeliveryAreas(),
        ]);

      setProfile(profileResult);
      setProfileForm({
        businessName: profileResult.business_name,
        businessType: profileResult.business_type,
        description: profileResult.description ?? "",
        phone: profileResult.phone,
        address: profileResult.address,
        area: profileResult.area,
      });
      setDeliveryAreas(areasResult);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function handleProfileSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (
      !profileForm.businessName.trim() ||
      !profileForm.businessType.trim() ||
      !profileForm.phone.trim() ||
      !profileForm.address.trim() ||
      !profileForm.area.trim()
    ) {
      setProfileError(
        "Complete all required business fields."
      );
      return;
    }

    setSavingProfile(true);

    try {
      const updatedProfile =
        await updateBusinessProfile({
          business_name: profileForm.businessName,
          business_type: profileForm.businessType,
          description:
            profileForm.description.trim() || undefined,
          phone: profileForm.phone,
          address: profileForm.address,
          area: profileForm.area,
        });

      setProfile(updatedProfile);
      setEditingProfile(false);
      setProfileSuccess(
        "Business profile updated successfully."
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        setProfileError(
          typeof detail === "string"
            ? detail
            : "The business profile could not be updated."
        );
      } else {
        setProfileError(
          "The business profile could not be updated."
        );
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAddArea(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (
      areaCode.trim().length < 2 ||
      areaName.trim().length < 2
    ) {
      setFormError(
        "Enter a valid area code and area name."
      );
      return;
    }

    if (deliveryFee < 0) {
      setFormError(
        "The delivery fee cannot be negative."
      );
      return;
    }

    if (estimatedMinutes < 1) {
      setFormError(
        "Estimated delivery time must be at least one minute."
      );
      return;
    }

    setSaving(true);

    try {
      await createBusinessDeliveryArea({
        area_code: areaCode,
        area_name: areaName,
        delivery_fee: deliveryFee,
        estimated_time_minutes: estimatedMinutes,
      });

      const updatedAreas =
        await getBusinessDeliveryAreas();

      setDeliveryAreas(updatedAreas);
      setProfile((currentProfile) =>
        currentProfile
          ? {
            ...currentProfile,
            delivery_enabled: true,
          }
          : currentProfile
      );

      setAreaCode("");
      setAreaName("");
      setDeliveryFee(0);
      setEstimatedMinutes(30);
      setSuccessMessage(
        "Delivery area added successfully."
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        setFormError(
          typeof detail === "string"
            ? detail
            : "The delivery area could not be added."
        );
      } else {
        setFormError(
          "The delivery area could not be added."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell
      role="business"
      title="Business settings"
      description="Review your business profile and configure delivery areas."
    >
      {loading ? (
        <LoadingSpinner />
      ) : loadError || !profile ? (
        <ErrorState
          message="We couldn't load your business settings."
          onRetry={() => void loadSettings()}
        />
      ) : (
        <>
          <form
            onSubmit={handleProfileSubmit}
            className="rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#C9472E]">
                  Business profile
                </p>

                <h2 className="mt-2 text-xl font-bold text-[#3A2925]">
                  {editingProfile ? "Edit your business information" : "Business information"}
                </h2>
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${profile.delivery_enabled
                    ? "bg-[#FFF0E5] text-[#C9472E]"
                    : "bg-gray-100 text-gray-600"
                  }`}
              >
                {profile.delivery_enabled
                  ? "Delivery enabled"
                  : "Pickup only"}
              </span>
            </div>

            {profileError && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div
                role="status"
                className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              >
                {profileSuccess}
              </div>
            )}

            <fieldset disabled={!editingProfile} className="mt-6 grid gap-5 sm:grid-cols-2 disabled:[&_input]:cursor-default disabled:[&_input]:bg-[#FFF9EE] disabled:[&_input]:text-[#71605A] disabled:[&_textarea]:cursor-default disabled:[&_textarea]:bg-[#FFF9EE] disabled:[&_textarea]:text-[#71605A]">
              <div>
                <label
                  htmlFor="business-name"
                  className="mb-2 block text-sm font-semibold"
                >
                  Business name
                </label>

                <input
                  id="business-name"
                  value={profileForm.businessName}
                  onChange={(event) =>
                    setProfileForm({
                      ...profileForm,
                      businessName: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="business-type"
                  className="mb-2 block text-sm font-semibold"
                >
                  Business type
                </label>

                <input
                  id="business-type"
                  value={profileForm.businessType}
                  onChange={(event) =>
                    setProfileForm({
                      ...profileForm,
                      businessType: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="business-phone"
                  className="mb-2 block text-sm font-semibold"
                >
                  Phone
                </label>

                <input
                  id="business-phone"
                  type="tel"
                  value={profileForm.phone}
                  onChange={(event) =>
                    setProfileForm({
                      ...profileForm,
                      phone: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="business-area"
                  className="mb-2 block text-sm font-semibold"
                >
                  Area
                </label>

                <input
                  id="business-area"
                  value={profileForm.area}
                  onChange={(event) =>
                    setProfileForm({
                      ...profileForm,
                      area: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="business-address"
                  className="mb-2 block text-sm font-semibold"
                >
                  Address
                </label>

                <input
                  id="business-address"
                  value={profileForm.address}
                  onChange={(event) =>
                    setProfileForm({
                      ...profileForm,
                      address: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="business-description"
                  className="mb-2 block text-sm font-semibold"
                >
                  Description
                </label>

                <textarea
                  id="business-description"
                  rows={4}
                  value={profileForm.description}
                  onChange={(event) =>
                    setProfileForm({
                      ...profileForm,
                      description: event.target.value,
                    })
                  }
                  className="w-full resize-none rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                />
              </div>
            </fieldset>

            <div className="mt-6 flex justify-end">
              {editingProfile ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => {
                      setProfileForm({
                        businessName: profile.business_name,
                        businessType: profile.business_type,
                        description: profile.description ?? "",
                        phone: profile.phone,
                        address: profile.address,
                        area: profile.area,
                      });
                      setEditingProfile(false);
                      setProfileError("");
                      setProfileSuccess("");
                    }}
                    className="rounded-xl border border-[#EEDFD3] bg-white px-5 py-3 text-sm font-semibold text-[#3A2925] hover:border-[#E85D3F]"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={savingProfile} className="rounded-xl bg-[#E85D3F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#C9472E] disabled:cursor-not-allowed disabled:opacity-60">
                    {savingProfile ? "Saving..." : "Save business profile"}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => { setEditingProfile(true); setProfileError(""); setProfileSuccess(""); }} className="rounded-xl bg-[#E85D3F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#C9472E]">
                  Edit business profile
                </button>
              )}
            </div>
          </form>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div>
              <h2 className="text-xl font-bold text-[#3A2925]">
                Delivery areas
              </h2>

              <p className="mt-1 text-sm text-[#71605A]">
                Customers can request delivery only within these
                configured areas.
              </p>

              {deliveryAreas.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-[#EEDFD3] bg-white">
                  <EmptyState
                    title="No delivery areas"
                    description="Add your first area to enable delivery."
                  />
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  {deliveryAreas.map((area) => (
                    <article
                      key={area._id}
                      className="rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-[#3A2925]">
                            {area.area_name}
                          </h3>

                          <p className="mt-1 text-sm text-[#71605A]">
                            Code: {area.area_code}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${area.is_active
                              ? "bg-[#FFF0E5] text-[#C9472E]"
                              : "bg-gray-100 text-gray-600"
                            }`}
                        >
                          {area.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#71605A]">
                        <span>
                          Fee: ${area.delivery_fee.toFixed(2)}
                        </span>

                        <span>
                          Estimated time:{" "}
                          {area.estimated_time_minutes} minutes
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={handleAddArea}
              className="h-fit space-y-5 rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm"
            >
              <div>
                <h2 className="text-xl font-bold text-[#3A2925]">
                  Add delivery area
                </h2>

                <p className="mt-1 text-sm text-[#71605A]">
                  Adding the first area enables delivery for your
                  business.
                </p>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {formError}
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                >
                  {successMessage}
                </div>
              )}

              <div>
                <label
                  htmlFor="area-code"
                  className="mb-2 block text-sm font-semibold"
                >
                  Area code
                </label>

                <input
                  id="area-code"
                  value={areaCode}
                  onChange={(event) =>
                    setAreaCode(event.target.value)
                  }
                  placeholder="Example: MINA"
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 uppercase outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="area-name"
                  className="mb-2 block text-sm font-semibold"
                >
                  Area name
                </label>

                <input
                  id="area-name"
                  value={areaName}
                  onChange={(event) =>
                    setAreaName(event.target.value)
                  }
                  placeholder="Example: Al Mina"
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="delivery-fee"
                  className="mb-2 block text-sm font-semibold"
                >
                  Delivery fee
                </label>

                <input
                  id="delivery-fee"
                  type="number"
                  min={0}
                  step={0.01}
                  value={deliveryFee}
                  onChange={(event) =>
                    setDeliveryFee(
                      Number(event.target.value)
                    )
                  }
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="delivery-time"
                  className="mb-2 block text-sm font-semibold"
                >
                  Estimated time in minutes
                </label>

                <input
                  id="delivery-time"
                  type="number"
                  min={1}
                  value={estimatedMinutes}
                  onChange={(event) =>
                    setEstimatedMinutes(
                      Number(event.target.value)
                    )
                  }
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[#E85D3F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#C9472E] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Adding..." : "Add delivery area"}
              </button>
            </form>
          </section>
        </>
      )}
    </DashboardShell>
  );
}
