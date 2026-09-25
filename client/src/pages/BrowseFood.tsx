import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Clock3, MapPin, Star } from "lucide-react";
import { getListings, type Listing } from "../services/listingService";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import PageFrame from "../components/layout/PageFrame";

const categories = [
    { label: "All", value: "" },
    { label: "Bakery", value: "bakery" },
    { label: "Prepared Meals", value: "prepared_meals" },
    { label: "Fresh Produce", value: "fresh_produce" },
    { label: "Dairy", value: "dairy" },
    { label: "Drinks", value: "drinks" },
    { label: "Desserts", value: "desserts" },
    { label: "Snacks", value: "snacks" },
];

const sortOptions = [
    { value: "default", label: "Default order" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
    { value: "discount", label: "Biggest Discount" },
];

export default function BrowseFood() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [search, setSearch] = useState("");
    const [submittedSearch, setSubmittedSearch] = useState("");
    const category = searchParams.get("category") ?? "";
    const [maxPrice, setMaxPrice] = useState("");
    const [submittedMaxPrice, setSubmittedMaxPrice] = useState("");
    const [sort, setSort] = useState("default");

    async function loadListings() {
        setLoading(true);
        setError(false);

        try {
            setListings(await getListings(submittedSearch, category, submittedMaxPrice));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadListings();
    }, [submittedSearch, category, submittedMaxPrice]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSubmittedSearch(search.trim());
        }, 350);

        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSubmittedMaxPrice(maxPrice);
        }, 350);

        return () => window.clearTimeout(timer);
    }, [maxPrice]);

    const sortedListings = [...listings].sort((a, b) => {
        if (sort === "price_asc") {
            return a.discounted_price - b.discounted_price;
        }
        if (sort === "price_desc") {
            return b.discounted_price - a.discounted_price;
        }
        if (sort === "discount") {
            const discountA =
                (a.original_price - a.discounted_price) / a.original_price;
            const discountB =
                (b.original_price - b.discounted_price) / b.original_price;
            return discountB - discountA;
        }
        return 0;
    });

    return (
      <PageFrame>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
            <h1 className="mb-2 text-3xl font-bold text-[#3A2925]">
                Browse Food
            </h1>
            <p className="mb-8 text-[#71605A]">
                Discover available food from local businesses.
            </p>

            <div
                className="mb-8 flex flex-wrap gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4"
            >
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search food or businesses..."
                    aria-label="Search food or businesses"
                    className="min-w-48 flex-1 rounded-xl border border-[#EEDFD3] px-4 py-2.5 text-sm outline-none focus:border-[#E85D3F]"
                />
                <div className="relative w-40">
                    <input
                        type="number"
                        min="0.50"
                        step="0.50"
                        value={maxPrice}
                        onChange={(event) => setMaxPrice(event.target.value)}
                        onBlur={() => {
                            if (maxPrice) setMaxPrice(Number(maxPrice).toFixed(2));
                        }}
                        placeholder="Max price"
                        aria-label="Maximum price in dollars"
                        className="w-full rounded-xl border border-[#EEDFD3] py-2.5 pl-4 pr-9 text-sm outline-none focus:border-[#E85D3F]"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#71605A]">
                        $
                    </span>
                </div>
                <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#E85D3F]"
                >
                    {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

            </div>

            <div className="mb-8 flex flex-wrap gap-2">
                {categories.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => setSearchParams(item.value ? { category: item.value } : {})}
                        aria-pressed={category === item.value}
                        className={`rounded-xl px-3 py-1.5 text-xs font-medium ${category === item.value
                            ? "bg-[#E85D3F] text-white"
                            : "bg-[#FFF0E5] text-[#71605A] hover:bg-[#FFF0E5]"
                            }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="mb-4 flex items-center justify-between gap-4">
                {!loading && !error && (
                    <p className="text-sm text-[#71605A]">
                        {listings.length} {listings.length === 1 ? "item" : "items"} found
                    </p>
                )}

                <button
                    type="button"
                    onClick={() => {
                        setSearch("");
                        setSubmittedSearch("");
                        setSearchParams({});
                        setMaxPrice("");
                        setSubmittedMaxPrice("");
                        setSort("default");
                    }}
                    className="ml-auto text-sm font-medium text-[#C9472E] hover:underline"
                >
                    Clear Filters
                </button>
            </div>

            {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading food listings">
                    {[0, 1, 2, 3, 4, 5].map((item) => (
                        <div key={item} className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white">
                            <div className="h-48 animate-pulse bg-[#FFF0E5]" />
                            <div className="space-y-3 p-5"><div className="h-4 w-24 animate-pulse rounded bg-[#FFF0E5]" /><div className="h-6 w-3/4 animate-pulse rounded bg-[#FFF0E5]" /><div className="h-4 w-1/2 animate-pulse rounded bg-[#FFF0E5]" /></div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <ErrorState
                    message="Could not load food listings."
                    onRetry={() => void loadListings()}
                />
            ) : listings.length === 0 ? (
                <EmptyState
                    title="No food available right now"
                    description="Please check back soon."
                />
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {sortedListings.map((listing) => (
                        <Link key={listing._id} to={`/food/${listing._id}`}>
                            <article className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm transition-shadow hover:shadow-md">
                                {listing.image_url ? (
                                    <img
                                        src={listing.image_url}
                                        alt={listing.title}
                                        className="h-48 w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-48 items-center justify-center bg-[#FFF0E5] text-5xl">
                                        🌿
                                    </div>
                                )}

                                <div className="p-5">
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-[#FFF0E5] px-3 py-1 text-xs font-medium capitalize text-[#C9472E]">
                                                {listing.category.replaceAll("_", " ")}
                                            </span>

                                            {listing.original_price > listing.discounted_price && (
                                                <span className="rounded-full bg-[#FFF0E5] px-3 py-1 text-xs font-semibold text-[#C9472E]">
                                                    {Math.round(
                                                        ((listing.original_price - listing.discounted_price) /
                                                            listing.original_price) *
                                                        100
                                                    )}
                                                    % off
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-[#71605A]">
                                            {listing.available_quantity} available
                                        </span>
                                    </div>

                                    <h2 className="text-lg font-semibold text-[#3A2925]">
                                        {listing.title}
                                    </h2>
                                    <p className="mt-1 text-sm text-[#71605A]">
                                        {listing.business.business_name}
                                        {listing.business.area ? ` · ${listing.business.area}` : ""}
                                    </p>

                                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#71605A]">
                                        <span className="flex items-center gap-1"><Star size={14} className="fill-[#F6B73C] text-[#F6B73C]" />{listing.review_count ? `${listing.average_rating} (${listing.review_count})` : "New"}</span>
                                        <span className="flex items-center gap-1 capitalize"><MapPin size={14} />{listing.fulfillment_type?.replaceAll("_", " ") || "Pickup"}</span>
                                        {listing.sale_deadline && <span className="flex items-center gap-1"><Clock3 size={14} />Ends {new Date(listing.sale_deadline).toLocaleDateString()}</span>}
                                    </div>

                                    {listing.available_quantity <= 3 && (
                                        <p className="mt-3 text-xs font-semibold text-[#C9472E]">Only {listing.available_quantity} left</p>
                                    )}

                                    <div className="mt-5 flex items-center gap-3 border-t border-[#EEDFD3] pt-4">
                                        <span className="text-xl font-bold text-[#C9472E]">
                                            ${listing.discounted_price.toFixed(2)}
                                        </span>
                                        <span className="text-sm text-gray-400 line-through">
                                            ${listing.original_price.toFixed(2)}
                                        </span>
                                        <span className="ml-auto text-sm font-semibold text-[#C9472E]">View details →</span>
                                    </div>
                                </div>
                            </article>
                        </Link>
                    ))}
                </div>
            )}
        </main>
        </PageFrame>
    );
}
