import { type FormEvent, useSyncExternalStore } from "react";
import {
  BarChart3,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import DashboardShell from "../components/layout/DashboardShell";
import { sellerInsightsStore } from "../services/sellerInsightsStore";

export default function SellerInsightsPage() {
  const { days, result, loading, error } = useSyncExternalStore(
    sellerInsightsStore.subscribe,
    sellerInsightsStore.getSnapshot
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const numericDays = Number(days);

    if (
      !Number.isInteger(numericDays) ||
      numericDays < 1 ||
      numericDays > 365
    ) {
      sellerInsightsStore.setError("Choose a period between 1 and 365 days.");
      return;
    }

    void sellerInsightsStore.analyze(numericDays);
  }

  return (
    <DashboardShell
      role="business"
      title="Seller Insights"
      description="Analyze your listing and surplus patterns with local AI."
    >
      <section className="rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E5] text-[#E85D3F]">
              <Sparkles size={22} />
            </span>

            <div>
              <h2 className="text-lg font-bold text-[#3A2925]">
                Generate an analysis
              </h2>

              <p className="mt-1 max-w-xl text-sm text-[#71605A]">
                BalaHader analyzes your real listing data and
                suggests practical ways to reduce unsold food.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex w-full gap-3 sm:w-auto"
          >
            <label className="min-w-0 flex-1 sm:w-48">
              <span className="sr-only">Analysis period</span>

              <select
                value={days}
                onChange={(event) =>
                  sellerInsightsStore.setDays(event.target.value)
                }
                className="w-full rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 180 days</option>
                <option value="365">Last year</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="whitespace-nowrap rounded-xl bg-[#E85D3F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#C9472E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </form>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
      </section>

      {!result ? (
        <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-[#EEDFD3] bg-white p-6 text-center shadow-sm">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF0E5] text-[#E85D3F]">
            <BarChart3 size={30} />
          </span>

          <h2 className="mt-4 text-xl font-bold text-[#3A2925]">
            No analysis generated yet
          </h2>

          <p className="mt-2 max-w-md text-sm text-[#71605A]">
            Choose a period and select Analyze to review your
            listing and surplus patterns.
          </p>
        </section>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm">
              <p className="text-sm text-[#71605A]">
                Analysis period
              </p>

              <p className="mt-2 text-2xl font-bold text-[#3A2925]">
                {result.date_range_days} days
              </p>
            </article>

            <article className="rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm">
              <p className="text-sm text-[#71605A]">
                Listings analyzed
              </p>

              <p className="mt-2 text-2xl font-bold text-[#3A2925]">
                {result.sample_size}
              </p>
            </article>

            <article className="rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm">
              <p className="text-sm text-[#71605A]">
                Products analyzed
              </p>

              <p className="mt-2 text-2xl font-bold text-[#3A2925]">
                {result.statistics.length}
              </p>
            </article>
          </div>

          <section className="rounded-2xl border border-[#EEDFD3] bg-[#FFF9EE] p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0E5] text-[#E85D3F]">
                <Sparkles size={20} />
              </span>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#E85D3F]">
                  Local AI analysis
                </p>

                <h2 className="font-bold text-[#3A2925]">
                  Recommendations
                </h2>
              </div>
            </div>

            <p className="mt-5 whitespace-pre-line text-sm leading-7 text-[#71605A]">
              {result.ai_insight}
            </p>

            <p className="mt-4 text-xs text-[#71605A]">
              These suggestions are based only on your BalaHader
              listing data. Review them before making business
              decisions.
            </p>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm">
            <div className="border-b border-[#EEDFD3] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <TrendingDown
                  size={21}
                  className="text-[#E85D3F]"
                />

                <h2 className="text-lg font-bold text-[#3A2925]">
                  Product statistics
                </h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#FFF9EE] text-[#71605A]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">
                      Product
                    </th>
                    <th className="px-5 py-3 font-semibold">
                      Times listed
                    </th>
                    <th className="px-5 py-3 font-semibold">
                      Offered
                    </th>
                    <th className="px-5 py-3 font-semibold">
                      Sold
                    </th>
                    <th className="px-5 py-3 font-semibold">
                      Unsold
                    </th>
                    <th className="px-5 py-3 font-semibold">
                      Unsold rate
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EEDFD3]">
                  {result.statistics.map((statistic) => (
                    <tr key={statistic.title}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#3A2925]">
                          {statistic.title}
                        </p>

                        {statistic.category && (
                          <p className="mt-1 text-xs capitalize text-[#71605A]">
                            {statistic.category.replaceAll(
                              "_",
                              " "
                            )}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {statistic.times_listed}
                      </td>

                      <td className="px-5 py-4">
                        {statistic.total_offered}
                      </td>

                      <td className="px-5 py-4">
                        {statistic.total_sold}
                      </td>

                      <td className="px-5 py-4">
                        {statistic.total_unsold}
                      </td>

                      <td className="px-5 py-4 font-semibold text-[#E85D3F]">
                        {statistic.unsold_rate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </DashboardShell>
  );
}
