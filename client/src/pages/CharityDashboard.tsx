import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { ArrowRight, CheckCircle2, Clock3, HeartHandshake, PackageCheck, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardShell from "../components/layout/DashboardShell";
import MetricCard from "../components/ui/MetricCard";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import BrandIcon from "../components/ui/BrandIcon";
import ProfileSetup from "../components/ProfileSetup";
import { dashboardService, type CharityProfile } from "../services/dashboardService";
import { getAvailableDonations, getMyClaimedDonations, type CharityDonation } from "../services/charityDonationService";
import { getNotifications, type Notification } from "../services/notificationService";

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

export default function CharityDashboard() {
  const [profile, setProfile] = useState<CharityProfile | null>(null);
  const [claims, setClaims] = useState<CharityDonation[]>([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [missingProfile, setMissingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      setLoading(true);
      setError(false);
      try {
        const charity = await dashboardService.getCharityProfile();
        if (!active) return;
        setProfile(charity);
        setMissingProfile(false);

        const [claimedResult, notificationResult, availableResult] = await Promise.allSettled([
          getMyClaimedDonations(),
          getNotifications(),
          charity.verification_status === "verified" ? getAvailableDonations() : Promise.resolve([]),
        ]);
        if (!active) return;
        if (claimedResult.status === "rejected") throw claimedResult.reason;
        setClaims(claimedResult.value);
        setNotifications(notificationResult.status === "fulfilled" ? notificationResult.value : []);
        setAvailableCount(availableResult.status === "fulfilled" ? availableResult.value.length : 0);
      } catch (cause: unknown) {
        if (!active) return;
        if (isAxiosError(cause) && cause.response?.status === 404) setMissingProfile(true);
        else setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDashboard();
    return () => { active = false; };
  }, [reload]);

  const completed = claims.filter((claim) => claim.status === "completed");
  const activeClaims = claims.filter((claim) => claim.status === "claimed" || claim.status === "ready_for_pickup");
  const readyCount = claims.filter((claim) => claim.status === "ready_for_pickup").length;
  const itemsCollected = completed.reduce((total, claim) => total + claim.quantity, 0);
  const upcoming = useMemo(() => [...activeClaims].sort((a, b) => {
    if (a.status === "ready_for_pickup" && b.status !== "ready_for_pickup") return -1;
    if (b.status === "ready_for_pickup" && a.status !== "ready_for_pickup") return 1;
    return new Date(a.pickup_deadline ?? 0).getTime() - new Date(b.pickup_deadline ?? 0).getTime();
  }).slice(0, 4), [claims]);

  return (
    <DashboardShell role="charity" title={profile?.organization_name ?? "Charity overview"} description="See what needs attention and track the food your organization has collected.">
      {loading ? <LoadingSpinner /> : missingProfile ? (
        <ProfileSetup role="charity" onComplete={() => { setLoading(true); setReload((value) => value + 1); }} />
      ) : error || !profile ? (
        <ErrorState message="We couldn't load your charity dashboard." onRetry={() => { setLoading(true); setReload((value) => value + 1); }} />
      ) : (
        <>
          {profile.verification_status !== "verified" ? (
            <section className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 sm:flex-row sm:items-center sm:justify-between" role="status">
              <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0" size={22} /><div><h2 className="font-bold capitalize">Verification {formatStatus(profile.verification_status)}</h2><p className="mt-1 text-sm">Complete or review your charity profile to get access to donation claims.</p></div></div>
              <Link to="/charity/settings" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold shadow-sm">View profile <ArrowRight size={15} /></Link>
            </section>
          ) : (
            <section className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-800" role="status">
              <CheckCircle2 size={22} /><div><h2 className="font-bold">Your charity is verified</h2><p className="mt-1 text-sm">You can claim available food donations and coordinate pickups.</p></div>
            </section>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<HeartHandshake size={21} />} label="Available donations" value={availableCount} />
            <MetricCard icon={<Clock3 size={21} />} label="Active claims" value={activeClaims.length} />
            <MetricCard icon={<PackageCheck size={21} />} label="Ready for pickup" value={readyCount} />
            <MetricCard icon={<CheckCircle2 size={21} />} label="Completed pickups" value={completed.length} />
          </div>

          <section className="grid gap-4 sm:grid-cols-2">
            <Link to="/charity/donations" className="group rounded-2xl bg-[#E85D3F] p-6 text-white shadow-sm transition hover:bg-[#C9472E]">
              <HeartHandshake size={26} />
              <h2 className="mt-5 font-display text-2xl font-bold">Find available food</h2>
              <p className="mt-2 text-sm leading-6 text-white/80">Browse new donations from local businesses and claim what your community needs.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">Browse donations <ArrowRight className="transition-transform group-hover:translate-x-1" size={16} /></span>
            </Link>
            <Link to="/charity/claims" className="group rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm transition hover:border-[#E85D3F]">
              <PackageCheck className="text-[#E85D3F]" size={26} />
              <h2 className="mt-5 font-display text-2xl font-bold text-[#3A2925]">Manage your claims</h2>
              <p className="mt-2 text-sm leading-6 text-[#71605A]">Check preparation progress, confirm collections, and review completed donations.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#C9472E]">View my claims <ArrowRight className="transition-transform group-hover:translate-x-1" size={16} /></span>
            </Link>
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.8fr)]">
            <section className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm">
              <div className="flex items-center justify-between gap-4 border-b border-[#EEDFD3] px-5 py-4 sm:px-6">
                <div><h2 className="font-display text-xl font-bold text-[#3A2925]">Upcoming pickups</h2><p className="mt-1 text-sm text-[#71605A]">Claims that still need attention.</p></div>
                <Link to="/charity/claims" className="text-sm font-semibold text-[#C9472E]">View all</Link>
              </div>
              {upcoming.length === 0 ? (
                <div className="px-6 py-10 text-center"><BrandIcon size="lg" className="mx-auto" /><p className="mt-4 font-semibold text-[#3A2925]">No upcoming pickups</p><p className="mt-1 text-sm text-[#71605A]">New claims will appear here.</p></div>
              ) : (
                <div className="divide-y divide-[#EEDFD3]">
                  {upcoming.map((claim) => (
                    <div key={claim._id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                      {claim.image_url ? <img src={claim.image_url} alt={claim.title} className="h-16 w-full rounded-xl object-cover sm:w-16" /> : <span className="flex h-16 w-full items-center justify-center rounded-xl bg-[#FFF0E5] sm:w-16"><BrandIcon /></span>}
                      <div className="min-w-0 flex-1"><h3 className="font-semibold text-[#3A2925]">{claim.title}</h3><p className="mt-1 text-xs text-[#71605A]">Quantity {claim.quantity}{claim.pickup_deadline ? ` · Pickup by ${new Date(claim.pickup_deadline).toLocaleString()}` : ""}</p></div>
                      <span className="w-fit rounded-full bg-[#FFF0E5] px-3 py-1 text-xs font-semibold capitalize text-[#C9472E]">{formatStatus(claim.status)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="space-y-6">
              <section className="rounded-2xl border border-[#EEDFD3] bg-[#3A2925] p-6 text-white shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#F6B73C]">Your impact</p>
                <p className="mt-4 font-display text-4xl font-bold">{itemsCollected}</p>
                <p className="mt-1 text-sm text-[#E3CFC2]">food items collected</p>
                <div className="mt-5 border-t border-white/10 pt-5 text-sm text-[#E3CFC2]"><span className="font-bold text-white">{completed.length}</span> completed pickups</div>
              </section>

              <section className="rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold text-[#3A2925]">Recent activity</h2><Link to="/notifications" className="text-sm font-semibold text-[#C9472E]">View all</Link></div>
                {notifications.length === 0 ? <p className="mt-4 text-sm text-[#71605A]">No recent activity.</p> : (
                  <div className="mt-3 divide-y divide-[#EEDFD3]">{notifications.slice(0, 4).map((item) => <div key={item._id} className="py-3"><p className="text-sm font-semibold text-[#3A2925]">{item.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#71605A]">{item.message}</p></div>)}</div>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
