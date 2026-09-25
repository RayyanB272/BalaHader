import { isAxiosError } from "axios";
import { useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/layout/Footer";
import PublicHeader from "../components/layout/PublicHeader";
import {
  requestPasswordReset,
  type ForgotPasswordResponse,
} from "../services/authService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [result, setResult] =
    useState<ForgotPasswordResponse | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setResult(null);
    setSubmitting(true);

    try {
      setResult(await requestPasswordReset(email));
    } catch (cause) {
      if (isAxiosError(cause)) {
        const detail = cause.response?.data?.detail;

        setError(
          typeof detail === "string"
            ? detail
            : "The password reset request could not be completed."
        );
      } else {
        setError(
          "The password reset request could not be completed."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PublicHeader />

      <main className="min-h-[70vh] bg-[#FFF9EE] px-4 py-16">
        <section className="mx-auto max-w-md rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#C9472E]">
            Account recovery
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#3A2925]">
            Forgot your password?
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#71605A]">
            Enter your account email. If an account exists, we’ll
            create password reset instructions.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {result ? (
            <div className="mt-6">
              <div
                role="status"
                className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-800"
              >
                {result.message}
              </div>

              {result.reset_url && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">
                    Development reset link
                  </p>

                  <p className="mt-1">
                    This link is shown only while the backend is
                    in development mode.
                  </p>

                  <a
                    href={result.reset_url}
                    className="mt-3 inline-block font-semibold text-[#C9472E] underline"
                  >
                    Reset password
                  </a>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setEmail("");
                }}
                className="mt-5 w-full rounded-xl border border-[#EEDFD3] px-5 py-3 text-sm font-semibold text-[#3A2925]"
              >
                Submit another email
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="reset-email"
                  className="mb-2 block text-sm font-semibold text-[#3A2925]"
                >
                  Email address
                </label>

                <input
                  id="reset-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#E85D3F] px-5 py-3 font-semibold text-white hover:bg-[#C9472E] disabled:opacity-60"
              >
                {submitting
                  ? "Creating reset link..."
                  : "Request password reset"}
              </button>
            </form>
          )}

          <Link
            to="/login"
            className="mt-6 block text-center text-sm font-semibold text-[#C9472E]"
          >
            Back to login
          </Link>
        </section>
      </main>

      <Footer />
    </>
  );
}