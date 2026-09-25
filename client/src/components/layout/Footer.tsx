import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Mail } from "lucide-react";

type Role = "customer" | "business" | "charity" | "admin";

const dashboardLabels: Record<Role, string> = {
  customer: "Customer Dashboard",
  business: "Business Dashboard",
  charity: "Charity Dashboard",
  admin: "Admin Dashboard",
};

const WHATSAPP_NUMBER_DISPLAY = "+961 70 473 485";
const WHATSAPP_LINK = "https://wa.me/96170473485";
const SUPPORT_EMAIL = "support@balahader.com";

const linkClass = "text-[#F0DFD2] transition-colors hover:text-white";

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm">{children}</ul>
    </div>
  );
}

export default function Footer() {
  const location = useLocation();
  const token = localStorage.getItem("access_token");
  const storedRole = localStorage.getItem("role");
  const role =
    token && ["customer", "business", "charity", "admin"].includes(storedRole ?? "")
      ? (storedRole as Role)
      : null;

  // Links like /#impact: if we're already on that section the URL doesn't change, so scroll by hand.
  function FooterLink({ to, children }: { to: string; children: ReactNode }) {
    const hash = to.split("#")[1];

    return (
      <li>
        <Link
          to={to}
          className={linkClass}
          onClick={() => {
            if (hash && location.pathname === "/" && location.hash === `#${hash}`) {
              document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
        >
          {children}
        </Link>
      </li>
    );
  }

  if (role === "customer") {
    return (
      <footer className="border-t border-[#EEDFD3] bg-[#3A2925] text-[#F0DFD2]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl font-bold text-white">BalaHader</p>
            <p className="mt-1 text-sm text-[#F6B73C]">Good Food. Brighter Tomorrow.</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link to="/browse" className={linkClass}>Browse Food</Link>
            <Link to="/orders" className={linkClass}>My Orders</Link>
            <a href={WHATSAPP_LINK} className={linkClass}>{WHATSAPP_NUMBER_DISPLAY}</a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>{SUPPORT_EMAIL}</a>
          </nav>
        </div>
        <div className="border-t border-white/10 px-6 py-4 text-center text-xs text-[#C9B3A6]">© {new Date().getFullYear()} BalaHader. All rights reserved.</div>
      </footer>
    );
  }

  return (
    <footer id="about-us" className="bg-[#3A2925] text-[#F0DFD2]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1.3fr]">
        {/* Brand */}
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E85D3F]">
              <svg viewBox="0 0 24 24" fill="#fff" className="h-5 w-5" aria-hidden="true">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20c8 0 10-8 10-8s0 8-8 8a5.71 5.71 0 00-1.71.26L7.39 22H9c8 0 12-8 12-8s-2 4-4-6z" />
              </svg>
            </span>
            <span className="font-display text-2xl font-bold text-white">BalaHader</span>
          </Link>
          <p className="mt-4 text-sm font-semibold text-[#F6B73C]">Good Food. Brighter Tomorrow.</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed">
            BalaHader is a food-rescue platform that connects local businesses, customers and charities in
            Tripoli, turning surplus food into affordable meals and meaningful donations.
          </p>
        </div>

        {/* Explore */}
        <Column title="Explore">
          <FooterLink to="/">Home</FooterLink>
          <FooterLink to="/browse">Browse Food</FooterLink>
          <FooterLink to="/#how-it-works">How It Works</FooterLink>
          <FooterLink to="/#impact">Our Impact</FooterLink>
        </Column>

        {/* Get involved: depends on who is signed in */}
        <Column title="Get Involved">
          {role ? (
            <>
              <FooterLink to={`/${role}`}>{dashboardLabels[role]}</FooterLink>
              <FooterLink to="/notifications">Notifications</FooterLink>
            </>
          ) : (
            <>
              <FooterLink to="/register">Create an Account</FooterLink>
              <FooterLink to="/register?type=business">For Businesses</FooterLink>
              <FooterLink to="/register?type=charity">For Charities</FooterLink>
              <FooterLink to="/login">Log In</FooterLink>
            </>
          )}
        </Column>

        {/* Contact */}
        <Column title="Contact">
          <li>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2.5 ${linkClass}`}
            >
              <span className="text-[#F6B73C]">
                <WhatsAppIcon />
              </span>
              <span>
                <span className="block text-xs text-[#C9B3A6]">WhatsApp</span>
                {WHATSAPP_NUMBER_DISPLAY}
              </span>
            </a>
          </li>
          <li>
            <a href={`mailto:${SUPPORT_EMAIL}`} className={`flex items-center gap-2.5 ${linkClass}`}>
              <Mail size={16} className="shrink-0 text-[#F6B73C]" />
              {SUPPORT_EMAIL}
            </a>
          </li>
        </Column>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl space-y-4 px-6 py-6 text-xs">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <FooterLink to="/privacy">Privacy Policy</FooterLink>
            <FooterLink to="/terms">Terms of Service</FooterLink>
          </ul>

          <div className="flex flex-col gap-1 text-[#C9B3A6] sm:flex-row sm:justify-between">
            <p>© {new Date().getFullYear()} BalaHader. All rights reserved.</p>
            <p>Built to reduce food waste in Tripoli, Lebanon.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
