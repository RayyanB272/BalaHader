import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getListing, type ListingDetail } from "../services/listingService";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import { addToCart } from "../services/cartService";
import PageFrame from "../components/layout/PageFrame";
import { getListingReviews, type ListingReviews } from "../services/reviewService";
import { Star } from "lucide-react";

function PageShell({ children }: { children: React.ReactNode }) {
    return (
        <PageFrame>{children}</PageFrame>
    );
}

export default function FoodDetails() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [listing, setListing] = useState<ListingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [cartNotice, setCartNotice] = useState("");
    const [cartError, setCartError] = useState("");
    const [reviews, setReviews] = useState<ListingReviews | null>(null);

    useEffect(() => {
        if (!id) {
            setError(true);
            setLoading(false);
            return;
        }

        getListing(id)
            .then(setListing)
            .catch(() => setError(true))
            .finally(() => setLoading(false));
        getListingReviews(id).then(setReviews).catch(() => setReviews(null));
    }, [id]);

    if (loading) return <PageShell><LoadingSpinner /></PageShell>;
    if (error || !listing) {
        return <PageShell><ErrorState message="This food listing could not be loaded." /></PageShell>;
    }

    const available =
        listing.remaining_quantity - (listing.reserved_quantity ?? 0);

    return (
      <PageShell>
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
            <Link to="/browse" className="text-sm font-medium text-[#C9472E]">
                ← Back to Browse Food
            </Link>

            <div className="mt-6 grid overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white md:grid-cols-2">
                {listing.image_url ? (
                    <img
                        src={listing.image_url}
                        alt={listing.title}
                        className="h-full min-h-80 w-full object-cover"
                    />
                ) : (
                    <div className="flex min-h-80 items-center justify-center bg-[#FFF0E5] text-7xl">
                        🌿
                    </div>
                )}

                <div className="p-8">
                    <span className="text-sm capitalize text-[#C9472E]">
                        {listing.category.replaceAll("_", " ")}
                    </span>
                    <h1 className="mt-2 text-3xl font-bold text-[#3A2925]">
                        {listing.title}
                    </h1>
                    <p className="mt-4 text-[#71605A]">
                        {listing.description || "No description provided."}
                    </p>

                    <p className="mt-6 text-sm text-[#71605A]">
                        Sold by {listing.business?.name || "Local business"}
                        {listing.business?.area ? ` · ${listing.business.area}` : ""}
                    </p>
                    <p className="mt-2 text-sm text-[#71605A]">
                        {Math.max(0, available)} available
                    </p>

                    {listing.pickup_deadline && (
                        <p className="mt-2 text-sm text-[#71605A]">
                            Collect by{" "}
                            <span className="font-semibold text-[#3A2925]">
                                {new Date(listing.pickup_deadline).toLocaleString()}
                            </span>
                        </p>
                    )}

                    <div className="mt-6 flex items-center gap-3">
                        <span className="text-2xl font-bold text-[#C9472E]">
                            ${listing.discounted_price.toFixed(2)}
                        </span>
                        <span className="text-gray-400 line-through">
                            ${listing.original_price.toFixed(2)}
                        </span>
                    </div>

                    {cartError && <p role="alert" className="mt-4 text-sm text-red-700">{cartError}</p>}
                    {cartNotice && <p role="status" className="mt-4 text-sm text-[#C9472E]">{cartNotice} <Link to="/cart" className="font-semibold underline">View cart</Link></p>}
                    <button
                        type="button"
                        disabled={available <= 0}
                        onClick={() => {
                            if (!localStorage.getItem("access_token") || localStorage.getItem("role") !== "customer") {
                                navigate(`/login?next=${encodeURIComponent(`/food/${listing._id}`)}`);
                                return;
                            }
                            try {
                                addToCart(listing);
                                setCartError("");
                                setCartNotice("Added to cart.");
                            } catch (cause) {
                                setCartNotice("");
                                setCartError(cause instanceof Error ? cause.message : "Could not add to cart.");
                            }
                        }}
                        className="mt-6 rounded-xl bg-[#E85D3F] px-6 py-3 font-semibold text-white hover:bg-[#C9472E] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {available > 0
                            ? (localStorage.getItem("role") === "customer" ? "Add to Cart" : "Sign in to order")
                            : "Sold Out"}
                    </button>
                </div>
            </div>
            <section className="mt-8 rounded-2xl border border-[#EEDFD3] bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-[#3A2925]">Customer reviews</h2>
                <span className="flex items-center gap-1 font-semibold text-[#3A2925]"><Star size={18} className="fill-[#F6B73C] text-[#F6B73C]" /> {reviews?.review_count ? `${reviews.average_rating} (${reviews.review_count})` : "No reviews yet"}</span>
              </div>
              {reviews?.reviews.map((review) => (
                <article key={review._id} className="mt-4 border-t border-[#EEDFD3] pt-4">
                  <div className="flex items-center justify-between"><p className="font-semibold text-[#3A2925]">{review.reviewer_name}</p><p className="text-sm text-[#F6B73C]">{"★".repeat(review.rating)}</p></div>
                  {review.comment && <p className="mt-2 text-sm text-[#71605A]">{review.comment}</p>}
                </article>
              ))}
            </section>
        </main>
      </PageShell>
    );
}
