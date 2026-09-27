import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { UserRound } from "lucide-react";
import DashboardShell from "../components/layout/DashboardShell";
import PageFrame from "../components/layout/PageFrame";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import {
  getCurrentUser,
  updateCurrentUser,
  type AccountProfile,
} from "../services/authService";

type Role = "customer" | "business" | "charity" | "admin";

export default function ProfilePage() {
  const role = (localStorage.getItem("role") || "customer") as Role;
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [savedProfile, setSavedProfile] = useState<AccountProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadProfile() {
    setLoading(true);
    setLoadError(false);
    try {
      const loaded = await getCurrentUser();
      setProfile(loaded);
      setSavedProfile(loaded);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (role !== "charity") void loadProfile();
  }, [role]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await updateCurrentUser({
        first_name: profile.first_name.trim(),
        last_name: profile.last_name.trim(),
        email: profile.email.trim(),
        phone: profile.phone?.trim() || "",
      });
      setProfile(updated);
      setSavedProfile(updated);
      setEditing(false);
      setMessage("Your profile has been saved.");
    } catch (cause: unknown) {
      const detail = axios.isAxiosError(cause) ? cause.response?.data?.detail : null;
      setError(typeof detail === "string" ? detail : "Your profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (role === "charity") {
    return <Navigate to="/charity/settings" replace />;
  }

  const content = loading ? (
    <LoadingSpinner />
  ) : loadError || !profile ? (
    <ErrorState message="We couldn't load your profile." onRetry={() => void loadProfile()} />
  ) : (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-4 border-b border-[#EEDFD3] pb-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0E5] text-[#E85D3F]">
          <UserRound size={28} />
        </span>
        <div>
          <h2 className="text-xl font-bold text-[#3A2925]">Personal information</h2>
          <p className="mt-1 text-sm capitalize text-[#71605A]">{profile.role} account · {profile.status}</p>
        </div>
      </div>

      <form onSubmit={saveProfile} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#3A2925]">
            First name
            <input required disabled={!editing} value={profile.first_name} onChange={(event) => setProfile({ ...profile, first_name: event.target.value })} className="mt-2 w-full rounded-xl border border-[#EEDFD3] px-4 py-3 font-normal outline-none focus:border-[#E85D3F] disabled:cursor-default disabled:bg-[#FFF9EE] disabled:text-[#71605A]" />
          </label>
          <label className="text-sm font-semibold text-[#3A2925]">
            Last name
            <input required disabled={!editing} value={profile.last_name} onChange={(event) => setProfile({ ...profile, last_name: event.target.value })} className="mt-2 w-full rounded-xl border border-[#EEDFD3] px-4 py-3 font-normal outline-none focus:border-[#E85D3F] disabled:cursor-default disabled:bg-[#FFF9EE] disabled:text-[#71605A]" />
          </label>
        </div>
        <label className="block text-sm font-semibold text-[#3A2925]">
          Email address
          <input required disabled={!editing} type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} className="mt-2 w-full rounded-xl border border-[#EEDFD3] px-4 py-3 font-normal outline-none focus:border-[#E85D3F] disabled:cursor-default disabled:bg-[#FFF9EE] disabled:text-[#71605A]" />
        </label>
        <label className="block text-sm font-semibold text-[#3A2925]">
          Phone number
          <input disabled={!editing} type="tel" value={profile.phone || ""} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className="mt-2 w-full rounded-xl border border-[#EEDFD3] px-4 py-3 font-normal outline-none focus:border-[#E85D3F] disabled:cursor-default disabled:bg-[#FFF9EE] disabled:text-[#71605A]" />
        </label>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-[#FFF0E5] px-4 py-3 text-sm font-medium text-[#C9472E]">{message}</p>}

        {editing ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                if (savedProfile) setProfile(savedProfile);
                setEditing(false);
                setError("");
                setMessage("");
              }}
              className="rounded-xl border border-[#EEDFD3] bg-white px-5 py-3 font-semibold text-[#3A2925] hover:border-[#E85D3F] disabled:opacity-60"
            >
              Cancel
            </button>
            <button disabled={saving} className="rounded-xl bg-[#E85D3F] px-5 py-3 font-semibold text-white hover:bg-[#C9472E] disabled:opacity-60">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setMessage("");
              setError("");
            }}
            className="w-full rounded-xl bg-[#E85D3F] px-5 py-3 font-semibold text-white hover:bg-[#C9472E]"
          >
            Edit profile
          </button>
        )}
      </form>
    </section>
  );

  if (role === "customer") {
    return (
      <PageFrame>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-bold text-[#3A2925]">My profile</h1>
          <p className="mb-8 mt-2 text-[#71605A]">Review and update your personal information.</p>
          {content}
        </main>
      </PageFrame>
    );
  }

  return (
    <DashboardShell role={role} title="My profile" description="Review and update your personal information.">
      {content}
    </DashboardShell>
  );
}
