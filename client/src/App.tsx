import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import CustomerDashboard from "./pages/CustomerDashboard";
import BusinessDashboard from "./pages/BusinessDashboard";
import CharityDashboard from "./pages/CharityDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import RegisterPage from "./pages/RegisterPage";
import BrowseFood from "./pages/BrowseFood";
import FoodDetails from "./pages/FoodDetails";
import Landing from "./pages/Landing";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentPage from "./pages/PaymentPage";
import PaymentResultPage from "./pages/PaymentResultPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import NotFoundPage from "./pages/NotFoundPage";
import CreateBusinessListingPage from "./pages/CreateBusinessListingPage";
import BusinessListingsPage from "./pages/BusinessListingsPage";
import BusinessOrdersPage from "./pages/BusinessOrdersPage";
import BusinessDonationsPage from "./pages/BusinessDonationsPage";
import CreateBusinessDonationPage from "./pages/CreateBusinessDonationPage";
import AvailableDonationsPage from "./pages/AvailableDonationsPage";
import CharityClaimsPage from "./pages/CharityClaimsPage";
import AdminCharitiesPage from "./pages/AdminCharitiesPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminBusinessesPage from "./pages/AdminBusinessesPage";
import AdminListingsPage from "./pages/AdminListingsPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminDonationsPage from "./pages/AdminDonationsPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import BusinessSettingsPage from "./pages/BusinessSettingsPage";
import CharitySettingsPage from "./pages/CharitySettingsPage";
import NotificationsPage from "./pages/NotificationsPage";
import EditBusinessListingPage from "./pages/EditBusinessListingPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ScrollToTop from "./components/ScrollToTop";
import LegalPage from "./pages/LegalPage";
import SmartBasketPage from "./pages/SmartBasketPage";
import SellerInsightsPage from "./pages/SellerInsightsPage";
import CharityOrdersPage from "./pages/CharityOrdersPage";

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/customer"
          element={
            <ProtectedRoute allowedRole="customer">
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/business"
          element={
            <ProtectedRoute allowedRole="business">
              <BusinessDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/charity"
          element={
            <ProtectedRoute allowedRole="charity">
              <CharityDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/register"
          element={<RegisterPage />}
        />
        <Route path="/browse" element={<BrowseFood />} />
        <Route path="/food/:id" element={<FoodDetails />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/" element={<Landing />} />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute allowedRole="customer">
              <CheckoutPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment"
          element={
            <ProtectedRoute allowedRole="customer">
              <PaymentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment-result"
          element={
            <ProtectedRoute allowedRole="customer">
              <PaymentResultPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute allowedRole="customer">
              <MyOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
  path="/smart-basket"
  element={
    <ProtectedRoute allowedRole="customer">
      <SmartBasketPage />
    </ProtectedRoute>
  }
/>
        <Route path="/access-denied" element={<AccessDeniedPage />} />
        <Route
          path="/business/donations"
          element={
            <ProtectedRoute allowedRole="business">
              <BusinessDonationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/business/donations/new"
          element={
            <ProtectedRoute allowedRole="business">
              <CreateBusinessDonationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/charity/donations"
          element={
            <ProtectedRoute allowedRole="charity">
              <AvailableDonationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/charity/claims"
          element={
            <ProtectedRoute allowedRole="charity">
              <CharityClaimsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/charity/orders"
          element={<ProtectedRoute allowedRole="charity"><CharityOrdersPage /></ProtectedRoute>}
        />
        <Route
          path="/admin/charities"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminCharitiesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/businesses"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminBusinessesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/listings"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminListingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/donations"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDonationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/business/settings"
          element={
            <ProtectedRoute allowedRole="business">
              <BusinessSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/charity/settings"
          element={
            <ProtectedRoute allowedRole="charity">
              <CharitySettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
  path="/notifications"
  element={
    <ProtectedRoute>
      <NotificationsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/business/listings/:id/edit"
  element={
    <ProtectedRoute allowedRole="business">
      <EditBusinessListingPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/forgot-password"
  element={<ForgotPasswordPage />}
/>
<Route
  path="/reset-password"
  element={<ResetPasswordPage />}
/>
        <Route path="/terms" element={<LegalPage kind="terms" />} />
        <Route path="/privacy" element={<LegalPage kind="privacy" />} />
        <Route
  path="/business/insights"
  element={
    <ProtectedRoute allowedRole="business">
      <SellerInsightsPage />
    </ProtectedRoute>
  }
/>
        <Route path="*" element={<NotFoundPage />} />
        <Route
          path="/business/listings"
          element={
            <ProtectedRoute allowedRole="business">
              <BusinessListingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/business/listings/new"
          element={
            <ProtectedRoute allowedRole="business">
              <CreateBusinessListingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/business/orders"
          element={
            <ProtectedRoute allowedRole="business">
              <BusinessOrdersPage />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
