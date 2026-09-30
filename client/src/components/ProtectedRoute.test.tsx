import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import ProtectedRoute from "./ProtectedRoute";


function renderRoute(role?: string) {
  if (role) localStorage.setItem("role", role);
  return render(
    <MemoryRouter initialEntries={["/business"]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/access-denied" element={<p>Access denied</p>} />
        <Route path="/business" element={<ProtectedRoute allowedRole="business"><p>Business dashboard</p></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}


describe("ProtectedRoute", () => {
  it("redirects signed-out visitors", () => {
    renderRoute();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("rejects a different role", () => {
    renderRoute("customer");
    expect(screen.getByText("Access denied")).toBeInTheDocument();
  });

  it("allows the requested role", () => {
    renderRoute("business");
    expect(screen.getByText("Business dashboard")).toBeInTheDocument();
  });
});
