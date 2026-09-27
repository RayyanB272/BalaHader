import { useEffect, useMemo, useState } from "react";
import { Building2, MapPin, Store, Truck } from "lucide-react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import MetricCard from "../components/ui/MetricCard";
import {
  getAdminBusinesses,
  type AdminBusiness,
} from "../services/adminBusinessService";

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  async function loadBusinesses() {
    setLoading(true);
    setLoadError(false);

    try {
      setBusinesses(await getAdminBusinesses());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBusinesses();
  }, []);

  const filteredBusinesses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return businesses.filter((business) => {
      const matchesType = typeFilter === "all" || business.business_type === typeFilter;
      const matchesService = serviceFilter === "all" || (serviceFilter === "delivery" ? business.delivery_enabled : !business.delivery_enabled);
      const matchesSearch = !normalizedSearch || [
        business.business_name,
        business.business_type,
        business.phone,
        business.address,
        business.area,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
      return matchesType && matchesService && matchesSearch;
    });
  }, [businesses, search, typeFilter, serviceFilter]);
  const businessTypes = useMemo(() => Array.from(new Set(businesses.map((business) => business.business_type))).sort(), [businesses]);

  return (
    <DashboardShell
      role="admin"
      title="Business management"
      description="Review businesses operating on the BalaHader marketplace."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={<Building2 size={21} />} label="Registered businesses" value={businesses.length} />
        <MetricCard icon={<Truck size={21} />} label="Delivery enabled" value={businesses.filter((business) => business.delivery_enabled).length} />
        <MetricCard icon={<Store size={21} />} label="Pickup only" value={businesses.filter((business) => !business.delivery_enabled).length} />
      </div>

      <section className="grid gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4 lg:grid-cols-[1fr_210px_190px]">
        <label
          htmlFor="business-search"
          className="sr-only"
        >
          Search businesses
        </label>

        <input
          id="business-search"
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search by business name, type, phone, or area..."
          className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"
        />
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm capitalize"><option value="all">All business types</option>{businessTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select>
        <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm"><option value="all">All fulfillment</option><option value="delivery">Delivery enabled</option><option value="pickup">Pickup only</option></select>
      </section>

      {loading ? (
        <LoadingSpinner />
      ) : loadError ? (
        <ErrorState
          message="We couldn't load the registered businesses."
          onRetry={() => void loadBusinesses()}
        />
      ) : businesses.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title="No businesses found"
            description="Registered business profiles will appear here."
          />
        </section>
      ) : filteredBusinesses.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title="No matching businesses"
            description="Try a different search term."
          />
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredBusinesses.map((business) => (
            <article
              key={business._id}
              className="rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0E5] text-[#E85D3F]"><Building2 size={23} /></div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#C9472E]">
                    Business
                  </p>

                  <h2 className="mt-2 text-lg font-bold text-[#3A2925]">
                    {business.business_name}
                  </h2>

                  <p className="mt-1 text-sm capitalize text-[#71605A]">
                    {business.business_type.replaceAll("_", " ")}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    business.delivery_enabled
                      ? "bg-[#FFF0E5] text-[#C9472E]"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {business.delivery_enabled
                    ? "Delivery"
                    : "Pickup only"}
                </span>
              </div>

              <dl className="mt-5 space-y-4 border-t border-[#EEDFD3] pt-4 text-sm">
                <div>
                  <dt className="text-[#71605A]">Phone</dt>
                  <dd className="mt-1 font-semibold text-[#3A2925]">
                    {business.phone}
                  </dd>
                </div>

                <div>
                  <dt className="text-[#71605A]">Area</dt>
                  <dd className="mt-1 font-semibold text-[#3A2925]">
                    {business.area}
                  </dd>
                </div>

                <div>
                  <dt className="text-[#71605A]">Registered</dt>
                  <dd className="mt-1 font-semibold text-[#3A2925]">
                    {new Date(
                      business.created_at
                    ).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#FFF9EE] px-4 py-3 text-sm text-[#71605A]"><MapPin size={16} className="shrink-0 text-[#E85D3F]" /><span className="line-clamp-2">{business.address}</span></div>
            </article>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
