import { Link } from "react-router-dom";
import PublicHeader from "../components/layout/PublicHeader";
import Footer from "../components/layout/Footer";

export default function AccessDeniedPage() {
  const role = localStorage.getItem("role");
  const dashboard =
    role === "customer" || role === "business" ||
    role === "charity" || role === "admin"
      ? `/${role}`
      : "/login";

  return (
    <div className="flex min-h-screen flex-col bg-[#FFF9EE]">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <section className="max-w-md rounded-2xl border border-[#EEDFD3] bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-[#3A2925]">
            You cannot access this page
          </h1>
          <p className="mt-3 text-sm text-[#71605A]">
            This page belongs to a different account role.
          </p>
          <Link
            to={dashboard}
            className="mt-6 inline-block rounded-xl bg-[#E85D3F] px-5 py-3 font-semibold text-white"
          >
            Go to my dashboard
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}