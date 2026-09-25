import axios from "axios";
import { useEffect, useState } from "react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import {
  getCommissionSetting,
  updateCommissionSetting,
} from "../services/adminSettingsService";

export default function AdminSettingsPage() {
  const [commissionPercent, setCommissionPercent] = useState(0);
  const [savedPercent, setSavedPercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadSetting() {
    setLoading(true);
    setLoadError(false);

    try {
      const setting = await getCommissionSetting();

      setCommissionPercent(setting.commission_percent);
      setSavedPercent(setting.commission_percent);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSetting();
  }, []);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (
      !Number.isFinite(commissionPercent) ||
      commissionPercent < 0 ||
      commissionPercent > 100
    ) {
      setFormError(
        "Commission must be between 0% and 100%."
      );
      return;
    }

    setSaving(true);

    try {
      const result = await updateCommissionSetting(
        commissionPercent
      );

      setCommissionPercent(result.commission_percent);
      setSavedPercent(result.commission_percent);
      setSuccessMessage(
        `Commission updated to ${result.commission_percent}%.`
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        setFormError(
          typeof detail === "string"
            ? detail
            : "The commission setting could not be updated."
        );
      } else {
        setFormError(
          "The commission setting could not be updated."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell
      role="admin"
      title="Platform settings"
      description="Manage financial settings used for new BalaHader orders."
    >
      {loading ? (
        <LoadingSpinner />
      ) : loadError ? (
        <ErrorState
          message="We couldn't load the platform settings."
          onRetry={() => void loadSetting()}
        />
      ) : (
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl space-y-6 rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C9472E]">
              Marketplace commission
            </p>

            <h2 className="mt-2 text-xl font-bold text-[#3A2925]">
              Platform commission rate
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#71605A]">
              This percentage is used when calculating the
              platform commission and business earnings for new
              orders.
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
              htmlFor="commission"
              className="mb-2 block text-sm font-semibold text-[#3A2925]"
            >
              Commission percentage
            </label>

            <div className="relative">
              <input
                id="commission"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={commissionPercent}
                onChange={(event) => {
                  setCommissionPercent(
                    Number(event.target.value)
                  );
                  setSuccessMessage("");
                }}
                className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 pr-12 text-[#3A2925] outline-none focus:border-[#E85D3F]"
                required
              />

              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-semibold text-[#71605A]">
                %
              </span>
            </div>

            <p className="mt-2 text-sm text-[#71605A]">
              Current saved rate: {savedPercent}%
            </p>
          </div>

          <div className="rounded-xl bg-[#FFF9EE] p-4 text-sm text-[#71605A]">
            Example: On a $10.00 order, a{" "}
            {commissionPercent}% commission would be approximately{" "}
            <strong className="text-[#3A2925]">
              $
              {(
                10 *
                (commissionPercent / 100)
              ).toFixed(2)}
            </strong>
            .
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                saving ||
                commissionPercent === savedPercent
              }
              className="rounded-xl bg-[#E85D3F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#C9472E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save commission"}
            </button>
          </div>
        </form>
      )}
    </DashboardShell>
  );
}