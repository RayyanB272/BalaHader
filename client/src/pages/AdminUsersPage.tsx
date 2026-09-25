import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import {
  getAdminUsers,
  updateAdminUserStatus,
  type AdminUser,
  type UserRole,
} from "../services/adminUserService";

type RoleFilter = "all" | UserRole;

function formatValue(value: string) {
  return value.replaceAll("_", " ");
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] =
    useState<RoleFilter>("all");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setLoadError(false);

    try {
      setUsers(await getAdminUsers());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole =
        roleFilter === "all" || user.role === roleFilter;

      const searchableText = [
        user.first_name,
        user.last_name,
        user.email,
        user.phone ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      return matchesRole && matchesSearch;
    });
  }, [users, search, roleFilter]);

  async function handleStatusChange(user: AdminUser) {
    if (user.role === "admin") {
      return;
    }

    const nextStatus =
      user.status === "active" ? "suspended" : "active";

    setUpdatingId(user._id);
    setActionError("");

    try {
      await updateAdminUserStatus(user._id, nextStatus);

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser._id === user._id
            ? {
                ...currentUser,
                status: nextStatus,
              }
            : currentUser
        )
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.detail;

        setActionError(
          typeof message === "string"
            ? message
            : "The account status could not be updated."
        );
      } else {
        setActionError(
          "The account status could not be updated."
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <DashboardShell
      role="admin"
      title="User management"
      description="Review platform accounts and control account access."
    >
      <section className="grid gap-3 rounded-2xl border border-[#EEDFD3] bg-white p-4 sm:grid-cols-[1fr_220px]">
        <div>
          <label
            htmlFor="user-search"
            className="sr-only"
          >
            Search users
          </label>

          <input
            id="user-search"
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search by name, email, or phone..."
            className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"
          />
        </div>

        <div>
          <label
            htmlFor="role-filter"
            className="sr-only"
          >
            Filter by role
          </label>

          <select
            id="role-filter"
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as RoleFilter)
            }
            className="w-full rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"
          >
            <option value="all">All roles</option>
            <option value="customer">Customers</option>
            <option value="business">Businesses</option>
            <option value="charity">Charities</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </section>

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : loadError ? (
        <ErrorState
          message="We couldn't load the platform users."
          onRetry={() => void loadUsers()}
        />
      ) : users.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title="No users found"
            description="Registered accounts will appear here."
          />
        </section>
      ) : filteredUsers.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title="No matching users"
            description="Change the search text or role filter."
          />
        </section>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#EEDFD3]">
              <thead className="bg-[#FFF9EE]">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#71605A]">
                    User
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#71605A]">
                    Role
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#71605A]">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#71605A]">
                    Registered
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-[#71605A]">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#EEDFD3]">
                {filteredUsers.map((user) => (
                  <tr key={user._id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#3A2925]">
                        {user.first_name} {user.last_name}
                      </p>

                      <p className="mt-1 text-sm text-[#71605A]">
                        {user.email}
                      </p>

                      {user.phone && (
                        <p className="mt-1 text-xs text-[#71605A]">
                          {user.phone}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm capitalize text-[#71605A]">
                      {formatValue(user.role)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          user.status === "active"
                            ? "bg-[#FFF0E5] text-[#C9472E]"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-[#71605A]">
                      {new Date(
                        user.created_at
                      ).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {user.role === "admin" ? (
                        <span className="text-xs text-[#71605A]">
                          Protected
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={updatingId === user._id}
                          onClick={() =>
                            void handleStatusChange(user)
                          }
                          className={`rounded-xl border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                            user.status === "active"
                              ? "border-red-200 text-red-700 hover:bg-red-50"
                              : "border-[#EEDFD3] text-[#C9472E] hover:bg-[#FFF0E5]"
                          }`}
                        >
                          {updatingId === user._id
                            ? "Updating..."
                            : user.status === "active"
                              ? "Suspend"
                              : "Reactivate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}