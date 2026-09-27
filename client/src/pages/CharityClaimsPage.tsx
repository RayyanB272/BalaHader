import axios from "axios";
import { Fragment, useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import BrandIcon from "../components/ui/BrandIcon";
import ReviewForm from "../components/ReviewForm";
import { collectDonation, getMyClaimedDonations, type CharityDonation } from "../services/charityDonationService";

const formatValue = (value: string) => value.replaceAll("_", " ");
const legacyDonationImages: Record<string, string> = {
  "Fresh Chicken Sandwiches": "/products/sandwich-combo.jpg",
  "Fresh Lunch Box": "/products/chicken-and-rice-meal.jpg",
};

function getDonationImage(donation: CharityDonation) {
  return donation.image_url || legacyDonationImages[donation.title];
}

export default function CharityClaimsPage() {
  const [donations, setDonations] = useState<CharityDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredDonations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return donations.filter((donation) => {
      const matchesStatus = statusFilter === "all" || donation.status === statusFilter;
      const matchesSearch = !query || [donation.title, donation.category, donation._id]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [donations, search, statusFilter]);

  async function loadDonations() {
    setLoading(true);
    setLoadError(false);
    try { setDonations(await getMyClaimedDonations()); }
    catch { setLoadError(true); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadDonations(); }, []);

  async function handleCollect(donationId: string) {
    setCollectingId(donationId);
    setActionError("");
    try {
      await collectDonation(donationId);
      setDonations((current) => current.map((donation) => donation._id === donationId
        ? { ...donation, status: "completed", collected_at: new Date().toISOString(), completed_at: new Date().toISOString() }
        : donation));
    } catch (error) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null;
      setActionError(typeof detail === "string" ? detail : "The donation could not be marked as collected.");
    } finally { setCollectingId(null); }
  }

  return (
    <DashboardShell role="charity" title="My donation claims" description="Follow claimed donations and confirm completed pickups.">
      <section className="grid gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4 sm:grid-cols-[1fr_220px]">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search claims..." aria-label="Search donation claims" className="rounded-xl border border-[#EEDFD3] px-4 py-2.5 text-sm outline-none focus:border-[#E85D3F]" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter claims by status" className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-2.5 text-sm text-[#3A2925]">
          <option value="all">All statuses</option><option value="claimed">Claimed</option><option value="ready_for_pickup">Ready for pickup</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
        </select>
      </section>
      {actionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>}
      {loading ? <LoadingSpinner /> : loadError ? (
        <ErrorState message="We couldn't load your donation claims." onRetry={() => void loadDonations()} />
      ) : filteredDonations.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white"><EmptyState title={donations.length ? "No matching claims" : "No claimed donations"} description={donations.length ? "Try another search or status." : "Donations you claim will appear here."} /></section>
      ) : (
        <>
        <div className="space-y-4 md:hidden">
          {filteredDonations.map((donation) => (
            <article key={donation._id} className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {getDonationImage(donation) ? <img src={getDonationImage(donation)} alt={donation.title} className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E5]"><BrandIcon /></span>}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-[#3A2925]">{donation.title}</h2>
                        <p className="mt-0.5 text-xs capitalize text-[#71605A]">{donation.category ? formatValue(donation.category) : `#${donation._id.slice(-8).toUpperCase()}`}</p>
                      </div>
                      <span className="rounded-full bg-[#FFF0E5] px-2.5 py-1 text-[11px] font-semibold capitalize text-[#C9472E]">{formatValue(donation.status)}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#71605A]">Quantity: <span className="font-semibold text-[#3A2925]">{donation.quantity}</span></p>
                  </div>
                </div>
                <div className="mt-4 border-t border-[#EEDFD3] pt-3 text-xs text-[#71605A]">
                  <p>Claimed: {donation.claimed_at ? new Date(donation.claimed_at).toLocaleString() : "—"}</p>
                  {donation.pickup_deadline && <p className="mt-1">Pickup deadline: {new Date(donation.pickup_deadline).toLocaleString()}</p>}
                </div>
                {donation.status === "claimed" && <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">Waiting for the business to prepare this donation.</p>}
                {donation.status === "ready_for_pickup" && <button type="button" disabled={collectingId === donation._id} onClick={() => void handleCollect(donation._id)} className="mt-4 w-full rounded-xl bg-[#E85D3F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C9472E] disabled:opacity-60">{collectingId === donation._id ? "Updating..." : "Confirm collection"}</button>}
              </div>
              {donation.status === "completed" && <div className="border-t border-[#EEDFD3] bg-[#FFFCF8] p-4"><ReviewForm target="donation" targetId={donation._id} /></div>}
            </article>
          ))}
        </div>
        <div className="hidden overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm md:block"><div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#FFF0E5] text-[#71605A]"><tr><th className="px-5 py-3">Donation</th><th className="px-5 py-3">Quantity</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Claimed</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-[#EEDFD3]">
              {filteredDonations.map((donation) => (
                <Fragment key={donation._id}>
                  <tr className="align-middle">
                    <td className="px-5 py-4"><div className="flex min-w-52 items-center gap-3">{getDonationImage(donation) ? <img src={getDonationImage(donation)} alt={donation.title} className="h-14 w-14 rounded-xl object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#FFF0E5]"><BrandIcon /></span>}<div><p className="font-semibold text-[#3A2925]">{donation.title}</p><p className="text-xs capitalize text-[#71605A]">{donation.category ? formatValue(donation.category) : `#${donation._id.slice(-8).toUpperCase()}`}</p></div></div></td>
                    <td className="px-5 py-4">{donation.quantity}</td>
                    <td className="px-5 py-4"><span className="whitespace-nowrap rounded-full bg-[#FFF0E5] px-3 py-1 text-xs font-semibold capitalize text-[#C9472E]">{formatValue(donation.status)}</span></td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#71605A]">{donation.claimed_at ? new Date(donation.claimed_at).toLocaleString() : "—"}</td>
                    <td className="px-5 py-4 text-right">{donation.status === "ready_for_pickup" ? <button type="button" disabled={collectingId === donation._id} onClick={() => void handleCollect(donation._id)} className="whitespace-nowrap rounded-xl bg-[#E85D3F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#C9472E] disabled:opacity-60">{collectingId === donation._id ? "Updating..." : "Confirm collection"}</button> : <span className="text-xs text-[#71605A]">{donation.status === "claimed" ? "Waiting for business" : donation.status === "completed" ? "Collected" : "—"}</span>}</td>
                  </tr>
                  {donation.status === "completed" && <tr><td colSpan={5} className="bg-[#FFFCF8] px-5 py-4"><ReviewForm target="donation" targetId={donation._id} /></td></tr>}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div></div>
        </>
      )}
    </DashboardShell>
  );
}
