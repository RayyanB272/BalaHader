import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  ClipboardList,
  HeartHandshake,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PackageSearch,
  CircleUserRound,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Store,
  Star,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { logout } from "../../services/authService";
import BrandIcon from "../ui/BrandIcon";

type Role = "customer" | "business" | "charity" | "admin";

const roleNames: Record<Role, string> = {
  customer: "Customer",
  business: "Business",
  charity: "Charity",
  admin: "Admin",
};

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean };

const roleLinks: Record<Role, Item[]> = {
  customer: [
    { to: "/browse", label: "Browse food", icon: Store },
    { to: "/smart-basket", label: "Smart Basket", icon: Sparkles },
    { to: "/cart", label: "Cart", icon: ShoppingBasket },
    { to: "/orders", label: "Orders", icon: ClipboardList },
  ],
  business: [
    { to: "/business/insights", label: "Seller Insights", icon: Sparkles },
    { to: "/business/listings", label: "Food listings", icon: ListChecks },
    { to: "/business/orders", label: "Customer orders", icon: ClipboardList },
    { to: "/business/donations", label: "Food donations", icon: HeartHandshake },
    { to: "/business/reviews", label: "Reviews", icon: Star },
    { to: "/business/settings", label: "Business settings", icon: Settings },
  ],
  charity: [
    { to: "/charity/donations", label: "Available donations", icon: HeartHandshake },
    { to: "/charity/claims", label: "My claims", icon: ClipboardList },
    { to: "/charity/settings", label: "Charity profile", icon: Settings },
  ],
  admin: [
    { to: "/admin/charities", label: "Charity verifications", icon: ShieldCheck },
    { to: "/admin/users", label: "User managements", icon: UsersRound },
    { to: "/admin/businesses", label: "Business managements", icon: Building2 },
    { to: "/admin/listings", label: "Listing moderation", icon: PackageSearch },
    { to: "/admin/orders", label: "Order management", icon: ReceiptText },
    { to: "/admin/donations", label: "Donation management", icon: HeartHandshake },
    { to: "/admin/reviews", label: "Reviews", icon: Star },
    { to: "/admin/settings", label: "Platform settings", icon: Settings },
  ],
};

function navigationClass(isActive: boolean) {
  return [
    "flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm transition-colors",
    isActive
      ? "bg-white/12 font-semibold text-white shadow-[inset_3px_0_0_#F6B73C]"
      : "font-medium text-[#E3CFC2] hover:bg-white/8 hover:text-white",
  ].join(" ");
}

export default function DashboardShell({
  role,
  title = "",
  description = "",
  bare = false,
  children,
}: {
  role: Role;
  title?: string;
  description?: string;
  /** Sidebar only: the page renders its own heading and container. */
  bare?: boolean;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }

  const overview: Item = { to: `/${role}`, label: "Overview", icon: LayoutDashboard, end: true };
  const profileLink: Item = { to: "/profile", label: "My profile", icon: CircleUserRound };
  const notificationLink: Item = { to: "/notifications", label: "Notifications", icon: Bell };
  const items: Item[] = role === "admin"
    ? [overview, notificationLink, ...roleLinks.admin, profileLink]
    : [overview, notificationLink, ...roleLinks[role], ...(role === "charity" ? [] : [profileLink])];

  return (
    <div className="min-h-screen bg-[#FFF9EE] text-[#3A2925] lg:flex">
      <aside className="bg-[#3A2925] lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col">
        <div className="flex items-center justify-between px-5 py-5 lg:px-6 lg:py-7">
          <Link to="/" className="flex items-center gap-3">
            <BrandIcon className="ring-1 ring-white/15" />
            <span className="font-display text-lg font-bold leading-none text-white">
              BalaHader
              <span className="mt-1.5 block font-sans text-xs font-medium text-[#C9B3A6]">
                {roleNames[role]} workspace
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={signOut}
            className="rounded-lg p-2 text-[#E3CFC2] hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>

        <nav
          aria-label="Dashboard navigation"
          className="flex gap-1.5 overflow-x-auto px-4 pb-4 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-4 lg:py-2"
        >
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => navigationClass(isActive)}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden px-4 pb-6 lg:block">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl border border-white/10 px-3.5 py-2.5 text-sm font-medium text-[#E3CFC2] transition-colors hover:bg-white/8 hover:text-white"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {bare ? (
          <div className="min-h-screen">{children}</div>
        ) : (
          <>
            <header className="border-b border-[#EEDFD3] bg-white px-5 py-7 sm:px-8 lg:px-10">
              <h1 className="text-3xl font-bold text-[#3A2925] sm:text-4xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-[15px] text-[#71605A]">{description}</p>
            </header>

            <main className="mx-auto max-w-7xl space-y-6 px-5 py-8 sm:px-8 lg:px-10">{children}</main>
          </>
        )}
      </div>
    </div>
  );
}
