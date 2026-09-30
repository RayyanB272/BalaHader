import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  Check,
  Circle,
  Eye,
  EyeOff,
  HeartHandshake,
  ShieldCheck,
  ShoppingBasket,
  Store,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import AuthLayout from "../components/layout/AuthLayout";
import {
  createBusinessProfile,
  createCharityProfile,
  login,
  register,
} from "../services/authService";
import { saveSession } from "../services/sessionService";
import { uploadVerificationDocument } from "../services/uploadService";

type Role = "customer" | "business" | "charity";

const roles: { value: Role; label: string; icon: LucideIcon; text: string }[] = [
  { value: "customer", label: "Customer", icon: ShoppingBasket, text: "Buy surplus food from local businesses at a discount." },
  { value: "business", label: "Business", icon: Store, text: "List surplus food, reach customers and donate to charities." },
  { value: "charity", label: "Charity", icon: HeartHandshake, text: "Claim donated food for people in need. Admin verification required." },
];

const areas = [
  "El Mina", "Al Tal", "Al Qobbeh", "Bab al-Tabbaneh", "Jabal Mohsen", "Abu Samra",
  "Zahriyeh", "Al Mitein", "Haddadine", "Bahsas", "Dam wal Farz", "Nahr Abu Ali", "Other (Tripoli)",
];

const businessTypes = [
  "Restaurant", "Bakery", "Café", "Supermarket", "Grocery store",
  "Hotel or catering", "Sweets and desserts", "Other",
];

const input = "h-12 w-full rounded-xl border border-[#EEDFD3] bg-white px-4 text-[15px]";
const textarea = "w-full rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-[15px]";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-[#3A2925]">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-[#71605A]">{hint}</p>}
    </div>
  );
}

function SectionTitle({ number, title, text }: { number?: number; title: string; text?: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-[#EEDFD3] pb-3">
      {number && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E85D3F] text-xs font-bold text-white">
          {number}
        </span>
      )}
      <div>
        <h2 className="font-display text-xl font-bold leading-tight text-[#3A2925]">{title}</h2>
        {text && <p className="mt-0.5 text-sm text-[#71605A]">{text}</p>}
      </div>
    </div>
  );
}

function backendMessage(cause: unknown, fallback: string) {
  if (isAxiosError(cause)) {
    if (!cause.response) return "Can't reach the server. Please check that the backend is running.";
    const detail = cause.response.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item: { loc?: string[]; msg?: string }) => {
          const name = item.loc?.[item.loc.length - 1];
          const msg = (item.msg ?? "").replace(/^Value error, /, "");
          return name ? `${String(name).replaceAll("_", " ")}: ${msg}` : msg;
        })
        .join(". ");
    }
  }
  return fallback;
}

function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("type");

  const [role, setRole] = useState<Role>(requested === "business" || requested === "charity" ? requested : "customer");
  const [account, setAccount] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [org, setOrg] = useState({
    name: "", type: "", description: "", phone: "", address: "", area: "",
    delivery: "pickup", pickup_info: "", document: "",
  });
  const [accountCreated, setAccountCreated] = useState(false);
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  const password = account.password;
  const rules = [
    { ok: password.length >= 8, label: "At least 8 characters" },
    { ok: /[A-Z]/.test(password), label: "One uppercase letter" },
    { ok: /[a-z]/.test(password), label: "One lowercase letter" },
    { ok: /[0-9]/.test(password), label: "One number" },
  ];
  const mismatch = account.confirm.length > 0 && account.confirm !== password;
  const hasProfile = role !== "customer";

  const setA = (e: React.ChangeEvent<HTMLInputElement>) => setAccount((p) => ({ ...p, [e.target.name]: e.target.value }));
  const setO = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setOrg((p) => ({ ...p, [e.target.name]: e.target.value }));

  function validate() {
    if (!account.first_name.trim() || !account.last_name.trim()) return "Please enter your first and last name.";
    if (!/^\S+@\S+\.\S+$/.test(account.email.trim())) return "Please enter a valid email address.";
    if (!/^\+?[0-9\s-]{7,15}$/.test(account.phone.trim())) return "Please enter a valid phone number.";
    if (rules.some((rule) => !rule.ok)) return "Your password does not meet all the requirements.";
    if (account.confirm !== password) return "Passwords do not match.";

    if (hasProfile) {
      if (!org.name.trim()) return role === "business" ? "Please enter your business name." : "Please enter your organization name.";
      if (role === "business" && !org.type) return "Please choose a business type.";
      if (org.phone.trim() && !/^\+?[0-9\s-]{7,15}$/.test(org.phone.trim())) return "Please enter a valid phone number for your organization.";
      if (!org.area) return "Please choose your area in Tripoli.";
      if (!org.address.trim()) return "Please enter your full address.";
      if (role === "charity" && !verificationFile && !org.document) return "Please upload your verification document image.";
    }

    if (!accepted) return "Please accept the Terms of Service and Privacy Policy.";
    return "";
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;

    setLoading(true);

    try {
      if (!accountCreated) {
        const email = account.email.trim().toLowerCase();
        await register({
          first_name: account.first_name.trim(),
          last_name: account.last_name.trim(),
          email,
          phone: account.phone.trim(),
          password,
          role,
        });
        const auth = await login({ email, password });
        saveSession(auth.role, auth.first_name, auth.last_name);
        setAccountCreated(true);
      }

      const phone = org.phone.trim() || account.phone.trim();

      if (role === "business") {
        await createBusinessProfile({
          business_name: org.name.trim(),
          business_type: org.type,
          description: org.description.trim() || undefined,
          phone,
          address: org.address.trim(),
          area: org.area,
          delivery_enabled: org.delivery === "both",
          pickup_info: org.pickup_info.trim() || undefined,
        });
      } else if (role === "charity") {
        const documentUrl = org.document || (await uploadVerificationDocument(verificationFile!)).image_url;
        setOrg((current) => ({ ...current, document: documentUrl }));
        await createCharityProfile({
          organization_name: org.name.trim(),
          description: org.description.trim() || undefined,
          phone,
          address: org.address.trim(),
          area: org.area,
          verification_document_url: documentUrl,
        });
      }

      const requestedNext = searchParams.get("next");
      const safeNext = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
        ? requestedNext
        : null;
      navigate(role === "customer" && safeNext ? safeNext : `/${role}`, { replace: true });
    } catch (cause) {
      setError(backendMessage(cause, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      wide
      heading="Join a community that wastes less."
      text="Whether you buy, sell or donate surplus food, BalaHader connects you to meaningful action in Tripoli."
    >
      <form onSubmit={submit} className="space-y-8 rounded-3xl border border-[#EEDFD3] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-9">
        <div>
          <h1 className="text-3xl font-bold text-[#3A2925]">Create your account</h1>
          <p className="mt-2 text-[#71605A]">Tell us who you are and how you'd like to use BalaHader.</p>
        </div>

        {accountCreated && (
          <div className="rounded-xl border border-[#EEDFD3] bg-[#FFF0E5] px-4 py-3 text-sm text-[#71605A]">
            Your account was created. Just finish the details below to continue.
          </div>
        )}

        {/* Account type */}
        <fieldset disabled={accountCreated}>
          <legend className="mb-2 text-sm font-semibold text-[#3A2925]">I want to join as</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {roles.map(({ value, label, icon: Icon, text }) => (
              <button
                key={value}
                type="button"
                aria-pressed={role === value}
                onClick={() => setRole(value)}
                className={`rounded-2xl border p-4 text-left transition ${
                  role === value ? "border-[#E85D3F] bg-[#FFF0E5] ring-2 ring-[#E85D3F]/20" : "border-[#EEDFD3] bg-white hover:border-[#E85D3F]/50"
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${role === value ? "bg-[#E85D3F] text-white" : "bg-[#FFF0E5] text-[#C9472E]"}`}>
                  <Icon size={18} />
                </span>
                <span className="mt-3 block font-semibold text-[#3A2925]">{label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-[#71605A]">{text}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Section 1: account */}
        <section className="space-y-4">
          <SectionTitle number={hasProfile ? 1 : undefined} title="Your details" text={hasProfile ? "The person who will manage the account." : undefined} />
          <fieldset disabled={accountCreated} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="first_name" label="First name">
                <input id="first_name" name="first_name" autoComplete="given-name" value={account.first_name} onChange={setA} className={input} />
              </Field>
              <Field id="last_name" label="Last name">
                <input id="last_name" name="last_name" autoComplete="family-name" value={account.last_name} onChange={setA} className={input} />
              </Field>
              <Field id="email" label="Email address">
                <input id="email" name="email" type="email" autoComplete="email" value={account.email} onChange={setA} placeholder="you@example.com" className={input} />
              </Field>
              <Field id="phone" label="Phone number">
                <input id="phone" name="phone" type="tel" autoComplete="tel" value={account.phone} onChange={setA} placeholder="03 123 456" className={input} />
              </Field>
              <Field id="password" label="Password">
                <div className="relative">
                  <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={account.password} onChange={setA} className={`${input} pr-12`} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#71605A] hover:text-[#C9472E]">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              <Field id="confirm" label="Confirm password">
                <input id="confirm" name="confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" value={account.confirm} onChange={setA} className={input} />
                {mismatch && <p className="mt-1.5 text-xs font-medium text-red-600">Passwords do not match.</p>}
              </Field>
            </div>

            <ul className="grid gap-1.5 sm:grid-cols-4" aria-live="polite">
              {rules.map((rule) => (
                <li key={rule.label} className={`flex items-center gap-2 text-xs ${rule.ok ? "font-semibold text-[#C9472E]" : "text-[#71605A]"}`}>
                  {rule.ok ? <Check size={14} /> : <Circle size={12} />}
                  {rule.label}
                </li>
              ))}
            </ul>
          </fieldset>
        </section>

        {/* Section 2: business or charity details */}
        {hasProfile && (
          <section className="space-y-4">
            <SectionTitle
              number={2}
              title={role === "business" ? "Business details" : "Organization details"}
              text={role === "business" ? "Customers will see these on your listings." : "This helps us verify your organization."}
            />

            {role === "charity" && (
              <div className="flex items-start gap-3 rounded-xl border border-[#EEDFD3] bg-[#FFF0E5] p-4 text-sm text-[#71605A]">
                <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#E85D3F]" />
                <p>
                  An admin must verify your charity before you can claim donations. You can sign in and explore
                  while your account is pending.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="name" label={role === "business" ? "Business name" : "Organization name"}>
                <input id="name" name="name" value={org.name} onChange={setO} className={input} />
              </Field>

              {role === "business" ? (
                <Field id="type" label="Business type">
                  <select id="type" name="type" value={org.type} onChange={setO} className={input}>
                    <option value="">Select a type</option>
                    {businessTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              ) : (
                <Field id="org-phone" label="Organization phone" hint="Leave empty to use your number above.">
                  <input id="org-phone" name="phone" type="tel" value={org.phone} onChange={setO} className={input} />
                </Field>
              )}

              {role === "business" && (
                <Field id="org-phone" label="Business phone" hint="Leave empty to use your number above.">
                  <input id="org-phone" name="phone" type="tel" value={org.phone} onChange={setO} className={input} />
                </Field>
              )}

              <Field id="area" label="Area in Tripoli">
                <select id="area" name="area" value={org.area} onChange={setO} className={input}>
                  <option value="">Select an area</option>
                  {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
            </div>

            <Field id="address" label="Full address">
              <input id="address" name="address" autoComplete="street-address" value={org.address} onChange={setO} placeholder="Street, building, floor" className={input} />
            </Field>

            <Field id="description" label="Description (optional)">
              <textarea id="description" name="description" rows={3} maxLength={500} value={org.description} onChange={setO} placeholder={role === "business" ? "What do you sell?" : "What does your organization do?"} className={textarea} />
            </Field>

            {role === "business" && (
              <>
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-[#3A2925]">How will customers get their food?</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["pickup", "Pickup only", "Customers collect from your address."],
                      ["both", "Pickup and delivery", "You also deliver to areas you choose."],
                    ].map(([value, label, text]) => (
                      <button key={value} type="button" aria-pressed={org.delivery === value} onClick={() => setOrg((p) => ({ ...p, delivery: value }))}
                        className={`rounded-xl border p-4 text-left ${org.delivery === value ? "border-[#E85D3F] bg-[#FFF0E5] ring-2 ring-[#E85D3F]/20" : "border-[#EEDFD3] hover:border-[#E85D3F]/50"}`}>
                        <span className="block text-sm font-semibold text-[#3A2925]">{label}</span>
                        <span className="mt-0.5 block text-xs text-[#71605A]">{text}</span>
                      </button>
                    ))}
                  </div>
                  {org.delivery === "both" && (
                    <p className="mt-2 text-xs text-[#71605A]">You can add delivery areas and fees later in Business Settings.</p>
                  )}
                </fieldset>

                <Field id="pickup_info" label="Pickup information (optional)" hint="Opening hours, where to collect, anything customers should know.">
                  <textarea id="pickup_info" name="pickup_info" rows={2} maxLength={300} value={org.pickup_info} onChange={setO} className={textarea} />
                </Field>
              </>
            )}

            {role === "charity" && (
              <Field id="document" label="Verification document" hint="Upload a clear JPG, PNG, or WEBP image up to 5 MB.">
                <input
                  id="document"
                  name="document"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setVerificationFile(file);
                    setOrg((current) => ({ ...current, document: "" }));
                  }}
                  className={`${input} py-2.5 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FFF0E5] file:px-3 file:py-1 file:font-semibold file:text-[#C9472E]`}
                />
                {verificationFile && <p className="mt-2 text-xs font-medium text-[#C9472E]">Selected: {verificationFile.name}</p>}
              </Field>
            )}
          </section>
        )}

        {/* Submit */}
        <div className="space-y-4">
          <label className="flex items-start gap-3 text-sm text-[#71605A]">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span>
              I agree to the{" "}
              <Link to="/terms" target="_blank" className="font-semibold text-[#C9472E] hover:underline">Terms of Service</Link>{" "}
              and{" "}
              <Link to="/privacy" target="_blank" className="font-semibold text-[#C9472E] hover:underline">Privacy Policy</Link>.
            </span>
          </label>

          {error && (
            <div ref={errorRef} role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-[#E85D3F] font-semibold text-white hover:bg-[#C9472E]">
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="text-center text-sm text-[#71605A]">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-[#C9472E] hover:underline">Sign in</Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}

export default RegisterPage;
