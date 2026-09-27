import { useEffect, useMemo, useState } from "react";
import { MessageSquareText, Star } from "lucide-react";
import DashboardShell from "../components/layout/DashboardShell";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { getAdminReviews, getBusinessReviews, type Review } from "../services/reviewService";

export default function ReviewsPage({ role }: { role: "business" | "admin" }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");

  async function load() {
    setLoading(true); setError(false);
    try { setReviews(await (role === "admin" ? getAdminReviews() : getBusinessReviews())); }
    catch { setError(true); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [role]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reviews.filter((review) => (type === "all" || review.target_type === type) && (!query || [review.target_title, review.reviewer_name, review.business_name, review.comment].some((value) => value?.toLowerCase().includes(query))));
  }, [reviews, search, type]);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

  return <DashboardShell role={role} title="Reviews" description={role === "admin" ? "Monitor customer and charity feedback across the platform." : "See what customers and charities say about your food."}>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-[#EEDFD3] bg-white p-5"><p className="text-sm text-[#71605A]">Average rating</p><p className="mt-2 flex items-center gap-2 text-2xl font-bold"><Star className="fill-[#F6B73C] text-[#F6B73C]" />{average.toFixed(1)}</p></div>
      <div className="rounded-2xl border border-[#EEDFD3] bg-white p-5"><p className="text-sm text-[#71605A]">Total reviews</p><p className="mt-2 text-2xl font-bold">{reviews.length}</p></div>
    </div>
    <section className="grid gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4 sm:grid-cols-[1fr_220px]">
      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reviews..." className="rounded-xl border border-[#EEDFD3] px-4 py-2.5 text-sm outline-none focus:border-[#E85D3F]" />
      <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-2.5 text-sm"><option value="all">All review types</option><option value="listing">Customer reviews</option><option value="donation">Charity reviews</option></select>
    </section>
    {loading ? <LoadingSpinner /> : error ? <ErrorState message="Reviews could not be loaded." onRetry={() => void load()} /> : filtered.length === 0 ? <EmptyState title={reviews.length ? "No matching reviews" : "No reviews yet"} description={reviews.length ? "Try another search or filter." : "Submitted feedback will appear here."} /> :
      <div className="grid gap-4 md:grid-cols-2">{filtered.map((review) => <article key={review._id} className="rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0E5] text-[#E85D3F]"><MessageSquareText size={19} /></span><div><h2 className="font-bold">{review.target_title}</h2><p className="mt-1 text-xs text-[#71605A]">{review.business_name || (review.target_type === "donation" ? "Donation" : "Food listing")}</p></div></div><span className="rounded-full bg-[#FFF0E5] px-3 py-1 text-xs font-semibold capitalize text-[#C9472E]">{review.target_type}</span></div>
        <div className="mt-4 flex gap-1" aria-label={`${review.rating} out of 5 stars`}>{[1,2,3,4,5].map((value) => <Star key={value} size={18} className={value <= review.rating ? "fill-[#F6B73C] text-[#F6B73C]" : "text-[#D9C9BE]"} />)}</div>
        <p className="mt-3 min-h-12 text-sm leading-6 text-[#71605A]">{review.comment || "No written comment."}</p>
        <div className="mt-4 flex justify-between border-t border-[#EEDFD3] pt-3 text-xs text-[#71605A]"><span>{review.reviewer_name}</span><time>{new Date(review.created_at).toLocaleDateString()}</time></div>
      </article>)}</div>}
  </DashboardShell>;
}
