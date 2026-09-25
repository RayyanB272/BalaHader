import { isAxiosError } from "axios";
import { useState } from "react";
import {
  Link,
  useSearchParams,
} from "react-router-dom";
import Footer from "../components/layout/Footer";
import PublicHeader from "../components/layout/PublicHeader";
import { resetPassword } from "../services/authService";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError(
        "This password reset link is missing its token."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError(
        "Password must contain an uppercase letter."
      );
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError(
        "Password must contain a lowercase letter."
      );
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("Password must contain a number.");
      return;
    }

    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await resetPassword({
        token,
        new_password: password,
      });

      setSuccess(true);
      setPassword("");
      setConfirmation("");
    } catch (cause) {
      if (isAxiosError(cause)) {
        const detail = cause.response?.data?.detail;

        setError(
          typeof detail === "string"
            ? detail
            : "The password could not be reset."
        );
      } else {
        setError(
          "The password could not be reset."
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
            Create a new password
          </h1>

          {!token ? (
            <div className="mt-6">
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                This password reset link is invalid because its
                token is missing.
              </div>

              <Link
                to="/forgot-password"
                className="mt-5 block text-center font-semibold text-[#C9472E]"
              >
                Request a new reset link
              </Link>
            </div>
          ) : success ? (
            <div className="mt-6">
              <div
                role="status"
                className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-800"
              >
                Your password was reset successfully. You can now
                sign in with the new password.
              </div>

              <Link
                to="/login"
                className="mt-5 block w-full rounded-xl bg-[#E85D3F] px-5 py-3 text-center font-semibold text-white hover:bg-[#C9472E]"
              >
                Go to login
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-sm font-semibold text-[#3A2925]"
                >
                  New password
                </label>

                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  name="new-password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-semibold text-[#3A2925]"
                >
                  Confirm new password
                </label>

                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  name="confirm-password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) =>
                    setConfirmation(event.target.value)
                  }
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 outline-none focus:border-[#E85D3F]"
                  required
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-[#71605A]">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(event) =>
                    setShowPassword(event.target.checked)
                  }
                />
                Show passwords
              </label>

              <div className="rounded-xl bg-[#FFF9EE] px-4 py-3 text-xs leading-5 text-[#71605A]">
                Use at least 8 characters with an uppercase
                letter, lowercase letter, and number.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#E85D3F] px-5 py-3 font-semibold text-white hover:bg-[#C9472E] disabled:opacity-60"
              >
                {submitting
                  ? "Resetting password..."
                  : "Reset password"}
              </button>
            </form>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}