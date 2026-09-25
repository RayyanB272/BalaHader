import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { ClipboardCheck, HeartHandshake, ShieldCheck } from "lucide-react";
import DashboardShell from "../components/layout/DashboardShell";
import MetricCard from "../components/ui/MetricCard";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import ProfileSetup from "../components/ProfileSetup";
import { dashboardService, type CharityProfile, type DonationSummary } from "../services/dashboardService";

export default function CharityDashboard() {
  const [profile, setProfile] = useState<CharityProfile | null>(null);
  const [claims, setClaims] = useState<DonationSummary[]>([]);
  const [missingProfile, setMissingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([dashboardService.getCharityProfile(), dashboardService.getCharityClaims()])
      .then(([charity, donations]) => {
        if (active) { setProfile(charity); setClaims(donations); setMissingProfile(false); setError(false); }
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (isAxiosError(cause) && cause.response?.status === 404) setMissingProfile(true);
        else setError(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  return (
    <DashboardShell role="charity" title={profile?.organization_name ?? "Charity overview"} description="Follow your verification and donation claims.">
      {loading ? <LoadingSpinner /> : missingProfile ? <ProfileSetup role="charity" onComplete={() => { setLoading(true); setReload((value) => value + 1); }} /> : error || !profile ? <ErrorState message="We couldn't load your charity dashboard." onRetry={() => { setLoading(true); setReload((value) => value + 1); }} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard icon={<ShieldCheck size={21} />} label="Verification" value={profile.verification_status.replaceAll("_", " ")} />
            <MetricCard icon={<HeartHandshake size={21} />} label="Donation claims" value={claims.length} />
            <MetricCard icon={<ClipboardCheck size={21} />} label="Completed pickups" value={claims.filter((claim) => claim.status === "completed").length} />
          </div>
          {profile.verification_status !== "verified" && (
            <div className="rounded-2xl border border-[#EEDFD3] bg-[#FFF0E5] p-5 text-sm text-[#3A2925]" role="status">
              Your profile is {profile.verification_status}. Donation access begins after admin verification.
            </div>
          )}
          <section className="rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#3A2925]">Recent donation claims</h2>
            {claims.length === 0 ? <p className="mt-4 text-sm text-[#71605A]">No donation claims yet.</p> : (
              <div className="mt-4 divide-y divide-[#EEDFD3]">
                {claims.slice(0, 5).map((claim) => (
                  <div key={claim._id} className="flex items-center justify-between gap-3 py-4 text-sm">
                    <span className="font-medium text-[#3A2925]">Claim #{claim._id.slice(-8).toUpperCase()}</span>
                    <span className="capitalize text-[#C9472E]">{claim.status.replaceAll("_", " ")}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </DashboardShell>
  );
}
