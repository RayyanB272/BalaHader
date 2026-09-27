import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { ArrowRight, Eye, EyeOff, Lock, Mail, TriangleAlert } from "lucide-react";
import AuthLayout from "../components/layout/AuthLayout";
import { login } from "../services/authService";

const inputClass =
  "h-12 w-full rounded-xl border border-[#EEDFD3] bg-white pl-11 pr-4 text-[15px] text-[#3A2925]";

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    searchParams.get("reason") === "expired" ? "Your session expired. Please sign in again." : ""
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const data = await login({ email: email.trim().toLowerCase(), password });
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("balahader_user_name", JSON.stringify({ first_name: data.first_name, last_name: data.last_name }));

      if (["customer", "business", "charity", "admin"].includes(data.role)) {
        const requestedNext = searchParams.get("next");
        const safeNext = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
          ? requestedNext
          : null;
        navigate(data.role === "customer" && safeNext ? safeNext : `/${data.role}`);
      }
    } catch (cause) {
      if (isAxiosError(cause) && !cause.response) {
        setError("Can't reach the server. Please check that the backend is running.");
      } else if (isAxiosError(cause) && typeof cause.response?.data?.detail === "string") {
        setError(cause.response.data.detail);
      } else {
        setError("Incorrect email or password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      heading="Welcome back to a community that wastes less."
      text="Sign in to pick up surplus food, manage your listings, or coordinate donations."
    >
      <div className="rounded-3xl border border-[#EEDFD3] bg-white p-7 shadow-[var(--shadow-soft)] sm:p-10">
        <h1 className="text-3xl font-bold text-[#3A2925]">Sign in</h1>
        <p className="mt-2 text-[#71605A]">Enter your details to access your account.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
              Email address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71605A]" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-semibold">
                Password
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-[#C9472E] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71605A]" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#71605A] hover:text-[#C9472E]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <TriangleAlert size={18} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#E85D3F] font-semibold text-white hover:bg-[#C9472E]"
          >
            {loading ? "Signing in..." : <>Sign in <ArrowRight size={18} /></>}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#71605A]">
          New to BalaHader?{" "}
          <Link to={`/register${searchParams.get("next") ? `?next=${encodeURIComponent(searchParams.get("next")!)}` : ""}`} className="font-semibold text-[#C9472E] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default LoginPage;
