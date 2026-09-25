import { useEffect, useState } from "react";
import {
  Building2,
  ClipboardList,
  HeartHandshake,
  Package,
  Users,
} from "lucide-react";
import DashboardShell from "../components/layout/DashboardShell";
import MetricCard from "../components/ui/MetricCard";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import {
  dashboardService,
  type AdminSummary,
} from "../services/dashboardService";

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    setError(false);

    try {
      setSummary(await dashboardService.getAdminSummary());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <DashboardShell
      role="admin"
      title="Platform overview"
      description="Monitor BalaHader activity and community impact."
    >
      {loading ? (
        <LoadingSpinner />
      ) : error || !summary ? (
        <ErrorState
          message="We couldn't load the admin dashboard."
          onRetry={() => void loadDashboard()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Users size={21} />}
            label="Users"
            value={summary.total_users}
          />
          <MetricCard
            icon={<Building2 size={21} />}
            label="Businesses"
            value={summary.total_businesses}
          />
          <MetricCard
            icon={<Package size={21} />}
            label="Active listings"
            value={summary.active_listings}
          />
          <MetricCard
            icon={<ClipboardList size={21} />}
            label="Orders"
            value={summary.total_orders}
          />
          <MetricCard
            icon={<HeartHandshake size={21} />}
            label="Donations"
            value={summary.total_donations}
          />
        </div>
      )}
    </DashboardShell>
  );
}