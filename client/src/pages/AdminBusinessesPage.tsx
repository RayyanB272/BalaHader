import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import {
  getAdminBusinesses,
  type AdminBusiness,
} from "../services/adminBusinessService";

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [search, setSearch] = useState("");
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

    if (!normalizedSearch) {
      return businesses;
    }

    return businesses.filter((business) =>
      [
        business.business_name,
        business.business_type,
        business.phone,
        business.address,
        business.area,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [businesses, search]);

  return (
    <DashboardShell
      role="admin"
      title="Business management"
      description="Review businesses operating on the BalaHader marketplace."
    >
      <section className="rounded-2xl border border-[#EEDFD3] bg-white p-4">
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
                  <dt className="text-[#71605A]">Address</dt>
                  <dd className="mt-1 font-semibold text-[#3A2925]">
                    {business.address}
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
            </article>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}