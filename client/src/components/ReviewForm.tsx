import { useEffect, useState } from "react";
import axios from "axios";
import { Star } from "lucide-react";
import { getMyReview, reviewDonation, reviewListing, type Review } from "../services/reviewService";

export default function ReviewForm({ target, targetId }: { target: "listing" | "donation"; targetId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittedReview, setSubmittedReview] = useState<Review | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getMyReview(target, targetId)
      .then((review) => {
        if (active) setSubmittedReview(review);
      })
      .catch(() => {
        if (active) setMessage("We could not check your review right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [target, targetId]);

  async function submit() {
    if (!rating) return setMessage("Choose a star rating first.");
    setSaving(true);
    setMessage("");
    try {
      const saved = target === "listing"
        ? await reviewListing(targetId, rating, comment)
        : await reviewDonation(targetId, rating, comment);
      setSubmittedReview(saved);
      setMessage("");
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const existing = await getMyReview(target, targetId);
        setSubmittedReview(existing);
        setMessage("");
      } else {
        setMessage("Your review could not be saved. Confirm that this order or pickup is completed.");
      }
    } finally { setSaving(false); }
  }

  if (loading) {
    return <div className="mt-4 min-h-36 rounded-xl border border-[#EEDFD3] bg-[#FFF9EE] p-4 text-sm text-[#71605A]">Checking review...</div>;
  }

  if (submittedReview) {
    return (
      <div className="mt-4 min-h-36 rounded-xl border border-[#EEDFD3] bg-[#FFF9EE] p-4">
        <p className="text-sm font-semibold text-[#3A2925]">Your review</p>
        <div className="mt-2 flex gap-1" aria-label={`${submittedReview.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Star key={value} size={22} className={value <= submittedReview.rating ? "fill-[#F6B73C] text-[#F6B73C]" : "text-[#D8C8BA]"} />
          ))}
        </div>
        {submittedReview.comment && <p className="mt-3 whitespace-pre-wrap text-sm text-[#71605A]">{submittedReview.comment}</p>}
        <p className="mt-3 text-xs font-medium text-[#C9472E]">Review submitted</p>
      </div>
    );
  }

  return (
    <div className="mt-4 min-h-36 rounded-xl border border-[#EEDFD3] bg-[#FFF9EE] p-4">
      <p className="text-sm font-semibold text-[#3A2925]">Share your experience</p>
      <div className="mt-2 flex gap-1" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} stars`}>
            <Star size={22} className={value <= rating ? "fill-[#F6B73C] text-[#F6B73C]" : "text-[#D8C8BA]"} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={2} placeholder="What went well? (optional)" className="mt-3 w-full rounded-xl border border-[#EEDFD3] bg-white px-3 py-2 text-sm" />
      <button type="button" disabled={saving} onClick={() => void submit()} className="mt-2 rounded-lg bg-[#E85D3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save review"}</button>
      {message && <p className="mt-2 text-xs text-[#71605A]">{message}</p>}
    </div>
  );
}
