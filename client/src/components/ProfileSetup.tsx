import { useState, type FormEvent } from "react";
import { createRoleProfile, type ProfileFormData } from "../services/profileService";

export default function ProfileSetup({ role, onComplete }: { role: "business" | "charity"; onComplete: () => void }) {
  const [form, setForm] = useState<ProfileFormData>({ name: "", phone: "", address: "", area: "", businessType: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createRoleProfile(role, form);
      onComplete();
    } catch {
      setError("We couldn't save your profile. Please check the details and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#C9472E]">One more step</p>
      <h2 className="mt-2 text-2xl font-bold text-[#3A2925]">Set up your {role} profile</h2>
      <p className="mt-2 text-sm text-[#71605A]">Your account is ready. Add your organization details to use this workspace.</p>
      {role === "charity" && <p className="mt-3 rounded-xl bg-[#FFF0E5] p-3 text-sm text-[#3A2925]">Charity access to donations begins after admin verification.</p>}
      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          { key: "name", label: role === "business" ? "Business name" : "Organization name" },
          ...(role === "business" ? [{ key: "businessType", label: "Business type" }] : []),
          { key: "phone", label: "Phone number" },
          { key: "area", label: "Area in Tripoli" },
          { key: "address", label: "Address" },
        ].map(({ key, label }) => (
          <label key={key} className={key === "address" ? "sm:col-span-2" : ""}>
            <span className="mb-1.5 block text-sm font-semibold text-[#3A2925]">{label}</span>
            <input required value={form[key as keyof ProfileFormData] ?? ""} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm outline-none focus:border-[#E85D3F] focus:ring-2 focus:ring-[#E85D3F]/10" />
          </label>
        ))}
        {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
        <button type="submit" disabled={saving} className="rounded-xl bg-[#E85D3F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#C9472E] disabled:opacity-60 sm:col-span-2">{saving ? "Saving profile..." : "Save profile"}</button>
      </form>
    </section>
  );
}
