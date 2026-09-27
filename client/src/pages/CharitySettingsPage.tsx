import axios from "axios";
import { useEffect, useState, type FormEvent } from "react";
import { Building2, CalendarDays, CheckCircle2, ExternalLink, FileCheck2, MapPin, Pencil, Phone, ShieldCheck } from "lucide-react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import { getCharityProfile, updateCharityProfile, type CharityProfile } from "../services/charitySettingsService";

type FormState = {
  organizationName: string;
  description: string;
  phone: string;
  address: string;
  area: string;
  verificationDocumentUrl: string;
};

function toForm(profile: CharityProfile): FormState {
  return {
    organizationName: profile.organization_name,
    description: profile.description ?? "",
    phone: profile.phone,
    address: profile.address,
    area: profile.area,
    verificationDocumentUrl: profile.verification_document_url ?? "",
  };
}

const inputClass = "mt-2 w-full rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 font-normal text-[#3A2925] outline-none transition focus:border-[#E85D3F] disabled:cursor-default disabled:bg-[#FFF9EE] disabled:text-[#71605A]";

function verificationDetails(status: CharityProfile["verification_status"]) {
  if (status === "verified") return { label: "Verified", title: "Verified charity", text: "Your organization can browse and claim available food donations.", style: "border-green-200 bg-green-50 text-green-800" };
  if (status === "rejected") return { label: "Needs attention", title: "Verification needs an update", text: "Review the administrator’s note, update your information, and submit it again.", style: "border-red-200 bg-red-50 text-red-800" };
  return { label: "Under review", title: "Verification in progress", text: "An administrator is reviewing your organization before donation claims are enabled.", style: "border-amber-200 bg-amber-50 text-amber-800" };
}

export default function CharitySettingsPage() {
  const [profile, setProfile] = useState<CharityProfile | null>(null);
  const [form, setForm] = useState<FormState>({ organizationName: "", description: "", phone: "", address: "", area: "", verificationDocumentUrl: "" });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadProfile() {
    setLoading(true);
    setLoadError(false);
    try {
      const result = await getCharityProfile();
      setProfile(result);
      setForm(toForm(result));
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadProfile(); }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");
    if (!form.organizationName.trim() || !form.phone.trim() || !form.address.trim() || !form.area.trim()) {
      setFormError("Complete all required organization fields.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateCharityProfile({
        organization_name: form.organizationName,
        description: form.description || undefined,
        phone: form.phone,
        address: form.address,
        area: form.area,
        verification_document_url: form.verificationDocumentUrl || undefined,
      });
      setProfile(updated);
      setForm(toForm(updated));
      setEditing(false);
      setSuccessMessage("Charity profile updated successfully.");
    } catch (error) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null;
      setFormError(typeof detail === "string" ? detail : "The charity profile could not be updated.");
    } finally { setSaving(false); }
  }

  return (
    <DashboardShell role="charity" title="Charity profile" description="Manage your public organization details and verification information.">
      {loading ? <LoadingSpinner /> : loadError || !profile ? (
        <ErrorState message="We couldn't load your charity profile." onRetry={() => void loadProfile()} />
      ) : (() => {
        const verification = verificationDetails(profile.verification_status);
        return (
          <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-5 xl:sticky xl:top-6">
              <section className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm">
                <div className="bg-[#3A2925] px-6 py-7 text-white">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E85D3F]"><Building2 size={28} /></span>
                  <h2 className="mt-5 font-display text-2xl font-bold">{profile.organization_name}</h2>
                  <p className="mt-1 text-sm text-[#E3CFC2]">{profile.area}</p>
                </div>
                <div className="space-y-4 p-6 text-sm">
                  <p className="flex items-start gap-3 text-[#71605A]"><Phone className="mt-0.5 shrink-0 text-[#E85D3F]" size={17} /><span>{profile.phone}</span></p>
                  <p className="flex items-start gap-3 text-[#71605A]"><MapPin className="mt-0.5 shrink-0 text-[#E85D3F]" size={17} /><span>{profile.address}</span></p>
                  <p className="flex items-start gap-3 text-[#71605A]"><CalendarDays className="mt-0.5 shrink-0 text-[#E85D3F]" size={17} /><span>Joined {new Date(profile.created_at).toLocaleDateString()}</span></p>
                </div>
              </section>

              <section className={`rounded-2xl border p-5 ${verification.style}`}>
                <div className="flex items-start justify-between gap-3">
                  <ShieldCheck className="shrink-0" size={24} />
                  <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">{verification.label}</span>
                </div>
                <h3 className="mt-4 font-bold">{verification.title}</h3>
                <p className="mt-2 text-sm leading-6">{verification.text}</p>
                {profile.verification_reason && <p className="mt-4 rounded-xl bg-white/70 px-3 py-2 text-sm"><strong>Administrator’s note:</strong> {profile.verification_reason}</p>}
              </section>
            </aside>

            <form onSubmit={handleSubmit} className="rounded-2xl border border-[#EEDFD3] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-4 border-b border-[#EEDFD3] pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#C9472E]">Organization details</p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-[#3A2925]">{editing ? "Edit charity information" : "Charity information"}</h2>
                  <p className="mt-1 text-sm text-[#71605A]">{editing ? "Update the fields below, then save your changes." : "Review the information shown to BalaHader and administrators."}</p>
                </div>
                {!editing && <button type="button" onClick={() => { setEditing(true); setFormError(""); setSuccessMessage(""); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E85D3F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#C9472E]"><Pencil size={16} />Edit profile</button>}
              </div>

              {formError && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>}
              {successMessage && <p role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"><CheckCircle2 size={17} />{successMessage}</p>}

              <fieldset disabled={!editing} className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-semibold text-[#3A2925] sm:col-span-2">Organization name<input required value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} className={inputClass} /></label>
                <label className="text-sm font-semibold text-[#3A2925]">Phone number<input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} /></label>
                <label className="text-sm font-semibold text-[#3A2925]">Area<input required value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputClass} /></label>
                <label className="text-sm font-semibold text-[#3A2925] sm:col-span-2">Full address<input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} /></label>
                <label className="text-sm font-semibold text-[#3A2925] sm:col-span-2">About the organization<textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe your charity and the communities it supports." className={`${inputClass} resize-none`} /></label>
                <label className="text-sm font-semibold text-[#3A2925] sm:col-span-2">Verification document URL<input type="url" value={form.verificationDocumentUrl} onChange={(e) => setForm({ ...form, verificationDocumentUrl: e.target.value })} placeholder="https://..." className={inputClass} /></label>
              </fieldset>

              {profile.verification_document_url && !editing && (
                <section className="mt-6 rounded-2xl border border-[#EEDFD3] bg-[#FFF9EE] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#E85D3F]"><FileCheck2 size={20} /></span>
                    <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#3A2925]">Verification document</p><p className="truncate text-xs text-[#71605A]">{profile.verification_document_url}</p></div>
                    <a href={profile.verification_document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-[#C9472E]">View <ExternalLink size={14} /></a>
                  </div>
                  <img src={profile.verification_document_url} alt="Charity verification document" className="mt-4 max-h-72 w-full rounded-xl border border-[#EEDFD3] bg-white object-contain" />
                </section>
              )}

              {editing && (
                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#EEDFD3] pt-6 sm:flex-row sm:justify-end">
                  <button type="button" disabled={saving} onClick={() => { setForm(toForm(profile)); setEditing(false); setFormError(""); setSuccessMessage(""); }} className="rounded-xl border border-[#EEDFD3] px-5 py-3 text-sm font-semibold text-[#3A2925] hover:border-[#E85D3F] disabled:opacity-60">Cancel</button>
                  <button type="submit" disabled={saving} className="rounded-xl bg-[#E85D3F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#C9472E] disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button>
                </div>
              )}
            </form>
          </div>
        );
      })()}
    </DashboardShell>
  );
}
