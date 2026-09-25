import { Link } from "react-router-dom";
import PublicHeader from "../components/layout/PublicHeader";
import Footer from "../components/layout/Footer";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FFF9EE]">
      <PublicHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <section className="max-w-md text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-[#C9472E]">
            404
          </p>

          <h1 className="mt-3 text-3xl font-bold text-[#3A2925]">
            Page not found
          </h1>

          <p className="mt-3 text-[#71605A]">
            The page you requested does not exist or may have moved.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="rounded-xl bg-[#E85D3F] px-5 py-3 font-semibold text-white"
            >
              Go home
            </Link>

            <Link
              to="/browse"
              className="rounded-xl border border-[#EEDFD3] bg-white px-5 py-3 font-semibold text-[#3A2925]"
            >
              Browse food
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}