import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

type Role = "customer" | "business" | "charity" | "admin";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: Role;
  allowedRoles?: Role[];
}

export default function ProtectedRoute({
  children,
  allowedRole,
  allowedRoles,
}: ProtectedRouteProps) {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role") as Role | null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!role) {
    return <Navigate to="/login?reason=expired" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/access-denied" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}