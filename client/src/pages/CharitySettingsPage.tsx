import axios from "axios";
import { useEffect, useState } from "react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import {
  getCharityProfile,
  updateCharityProfile,
  type CharityProfile,
} from "../services/charitySettingsService";

function getVerificationDisplay(
  status: CharityProfile["verification_status"]
) {
  if (status === "verified") {
    return {
      label: "Verified",
      title: "Your charity is verified",
      description:
        "You can browse available donations, claim food, and confirm collections.",
      className:
        "border-green-200 bg-green-50 text-green-800",
    };
  }

  if (status === "rejected") {
    return {
      label: "Rejected",
      title: "Verification was not approved",
      description:
        "Review the administrator's reason and update your profile information.",
      className:
        "border-red-200 bg-red-50 text-red-800",
    };
  }

  return {
    label: "Pending",
    title: "Verification is under review",
    description:
      "An administrator must verify your charity before it can claim donations.",
    className:
      "border-amber-200 bg-amber-50 text-amber-800",
  };
}

export default function CharitySettingsPage() {
  const [profile, setProfile] =
    useState<CharityProfile | null>(null);

  const [form, setForm] = useState({
    organizationName: "",
    description: "",
    phone: "",
    address: "",
    area: "",
    verificationDocumentUrl: "",
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadProfile() {
    setLoading(true);
    setLoadError(false);

    try {
      const result = await getCharityProfile();

      setProfile(result);
      setForm({
        organizationName: result.organization_name,
        description: result.description ?? "",
        phone: result.phone,
        address: result.address,
        area: result.area,
        verificationDocumentUrl:
          result.verification_document_url ?? "",
      });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (
      !form.organizationName.trim() ||
      !form.phone.trim() ||
      !form.address.trim() ||
      !form.area.trim()
    ) {
      setFormError(
        "Complete all required organization fields."
      );
      return;
    }

    setSaving(true);

    try {
      const updatedProfile = await updateCharityProfile({
        organization_name: form.organizationName,
        description: form.description || undefined,
        phone: form.phone,
        address: form.address,
        area: form.area,
        verification_document_url:
          form.verificationDocumentUrl || undefined,
      });

      setProfile(updatedProfile);
      setSuccessMessage(
        "Charity profile updated successfully."
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        setFormError(
          typeof detail === "string"
            ? detail
            : "The charity profile could not be updated."
        );
      } else {
        setFormError(
          "The charity profile could not be updated."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  const verification = profile
    ? getVerificationDisplay(profile.verification_status)
    : null;

  return (
    <DashboardShell
      role="charity"
      title="Charity profile"
      description="Manage your organization details and verification information."
    >
      {loading ? (
        <LoadingSpinner />
      ) : loadError || !profile || !verification ? (
        <ErrorState
          message="We couldn't load your charity profile."
          onRetry={() => void loadProfile()}
        />
      ) : (
        <>
          <section
            className={`rounded-2xl border p-5 ${verification.className}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {verification.title}
                </h2>

                <p className="mt-2 text-sm leading-6">
                  {verification.description}
                </p>
              </div>

              <span className="w-fit rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">
                {verification.label}
              </span>
            </div>

            {profile.verification_reason && (
              <div className="mt-4 rounded-xl bg-white/60 px-4 py-3 text-sm">
                <span className="font-semibold">
                  Administrator’s reason:
                </span>{" "}
                {profile.verification_reason}
              </div>
            )}
          </section>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#C9472E]">
                Organization profile
              </p>

              <h2 className="mt-2 text-xl font-bold text-[#3A2925]">
                Edit organization information
              </h2>
            </div>

            {formError && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {formError}
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              >
                {successMessage}
              </div>
            )}

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="organization-name"
                  className="mb-2 block text-sm font-semibold"
                >
                  Organization name
                </label>

                <input
                  id="organization-name"
                  value={form.organizationName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      organizationName: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="charity-phone"
                  className="mb-2 block text-sm font-semibold"
                >
                  Phone
                </label>

                <input
                  id="charity-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      phone: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="charity-area"
                  className="mb-2 block text-sm font-semibold"
                >
                  Area
                </label>

                <input
                  id="charity-area"
                  value={form.area}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      area: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="charity-address"
                  className="mb-2 block text-sm font-semibold"
                >
                  Address
                </label>

                <input
                  id="charity-address"
                  value={form.address}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      address: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="charity-description"
                  className="mb-2 block text-sm font-semibold"
                >
                  Description
                </label>

                <textarea
                  id="charity-description"
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  className="w-full resize-none rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="verification-document"
                  className="mb-2 block text-sm font-semibold"
                >
                  Verification document URL
                </label>

                <input
                  id="verification-document"
                  type="url"
                  value={form.verificationDocumentUrl}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      verificationDocumentUrl:
                        event.target.value,
                    })
                  }
                  placeholder="https://..."
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                />

                <p className="mt-2 text-xs text-[#71605A]">
                  Provide a public link to the organization’s
                  verification document.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#E85D3F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#C9472E] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save charity profile"}
              </button>
            </div>
          </form>
        </>
      )}
    </DashboardShell>
  );
}