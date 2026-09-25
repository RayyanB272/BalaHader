import { useEffect, useState } from "react";
import DashboardShell from "../components/layout/DashboardShell";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "../services/notificationService";

type Role = "customer" | "business" | "charity" | "admin";

const validRoles: Role[] = [
  "customer",
  "business",
  "charity",
  "admin",
];

export default function NotificationsPage() {
  const savedRole = localStorage.getItem("role");
  const role: Role = validRoles.includes(savedRole as Role)
    ? (savedRole as Role)
    : "customer";

  const [notifications, setNotifications] = useState<
    Notification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(
    null
  );
  const [markingAll, setMarkingAll] = useState(false);

  async function loadNotifications() {
    setLoading(true);
    setLoadError(false);

    try {
      setNotifications(await getNotifications());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function handleMarkRead(notificationId: string) {
    setUpdatingId(notificationId);

    try {
      await markNotificationRead(notificationId);

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification._id === notificationId
            ? {
                ...notification,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : notification
        )
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);

    try {
      await markAllNotificationsRead();

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          is_read: true,
          read_at:
            notification.read_at ??
            new Date().toISOString(),
        }))
      );
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  return (
    <DashboardShell
      role={role}
      title="Notifications"
      description="Follow important account, order, and donation updates."
    >
      {!loading && !loadError && unreadCount > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={markingAll}
            onClick={() => void handleMarkAllRead()}
            className="rounded-xl border border-[#E85D3F] px-4 py-2 text-sm font-semibold text-[#C9472E] hover:bg-[#FFF0E5] disabled:opacity-60"
          >
            {markingAll
              ? "Updating..."
              : `Mark all as read (${unreadCount})`}
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : loadError ? (
        <ErrorState
          message="We couldn't load your notifications."
          onRetry={() => void loadNotifications()}
        />
      ) : notifications.length === 0 ? (
        <section className="rounded-2xl border border-[#EEDFD3] bg-white">
          <EmptyState
            title="No notifications"
            description="Important updates will appear here."
          />
        </section>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article
              key={notification._id}
              className={`rounded-2xl border p-5 ${
                notification.is_read
                  ? "border-[#EEDFD3] bg-white"
                  : "border-green-200 bg-green-50"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-[#3A2925]">
                      {notification.title}
                    </h2>

                    {!notification.is_read && (
                      <span className="rounded-full bg-[#E85D3F] px-2 py-0.5 text-xs font-semibold text-white">
                        New
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm leading-6 text-[#71605A]">
                    {notification.message}
                  </p>

                  <p className="mt-3 text-xs text-[#71605A]">
                    {new Date(
                      notification.created_at
                    ).toLocaleString()}
                  </p>
                </div>

                {!notification.is_read && (
                  <button
                    type="button"
                    disabled={
                      updatingId === notification._id
                    }
                    onClick={() =>
                      void handleMarkRead(notification._id)
                    }
                    className="shrink-0 rounded-xl border border-[#EEDFD3] px-4 py-2 text-sm font-semibold text-[#C9472E] hover:bg-white disabled:opacity-60"
                  >
                    {updatingId === notification._id
                      ? "Updating..."
                      : "Mark as read"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}