import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { ClipboardList, HeartHandshake, PackageCheck, Wallet } from "lucide-react";
import DashboardShell from "../components/layout/DashboardShell";
import MetricCard from "../components/ui/MetricCard";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import ProfileSetup from "../components/ProfileSetup";
import { dashboardService, type BusinessSummary } from "../services/dashboardService";

export default function BusinessDashboard() {
  const [summary, setSummary] = useState<BusinessSummary | null>(null);
  const [missingProfile, setMissingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    dashboardService.getBusinessSummary()
      .then((data) => { if (active) { setSummary(data); setMissingProfile(false); setError(false); } })
      .catch((cause: unknown) => {
        if (!active) return;
        if (isAxiosError(cause) && cause.response?.status === 404) setMissingProfile(true);
        else setError(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  return (
    <DashboardShell role="business" title="Business overview" description="Track listings, sales, orders, and donations in one place.">
      {loading ? <LoadingSpinner /> : missingProfile ? <ProfileSetup role="business" onComplete={() => { setLoading(true); setReload((value) => value + 1); }} /> : error || !summary ? <ErrorState message="We couldn't load your business dashboard." onRetry={() => { setLoading(true); setReload((value) => value + 1); }} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<ClipboardList size={21} />} label="Active listings" value={summary.active_listings} sublabel={`${summary.total_listings} total`} />
            <MetricCard icon={<PackageCheck size={21} />} label="Completed orders" value={summary.completed_orders} sublabel={`${summary.total_orders} total`} />
            <MetricCard icon={<Wallet size={21} />} label="Earnings" value={`$${summary.earnings.toFixed(2)}`} />
            <MetricCard icon={<HeartHandshake size={21} />} label="Completed donations" value={summary.completed_donations} sublabel={`${summary.total_donations} total`} />
          </div>
          <section className="rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#3A2925]">Your impact at a glance</h2>
            <p className="mt-2 text-sm leading-6 text-[#71605A]">These figures come from your BalaHader orders, listings, and donations. They update as your business activity changes.</p>
          </section>
        </>
      )}
    </DashboardShell>
  );
}
