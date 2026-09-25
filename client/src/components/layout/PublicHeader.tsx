import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, ShoppingCart } from "lucide-react";
import { logout } from "../../services/authService";
import { getCartCount, subscribeToCart } from "../../services/cartService";

const Logo = () => (
  <Link to="/" className="flex flex-shrink-0 items-center gap-2.5">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3A2925] shadow-[0_6px_14px_-6px_rgba(22,61,43,0.7)]">
      <svg viewBox="0 0 24 24" fill="#F6B73C" className="h-5 w-5">
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20c8 0 10-8 10-8s0 8-8 8a5.71 5.71 0 00-1.71.26L7.39 22H9c8 0 12-8 12-8s-2 4-4-6z" />
      </svg>
    </div>
    <div>
      <div className="font-display text-lg font-bold leading-none text-[#3A2925]">BalaHader</div>
      <div className="mt-1 hidden text-[10px] font-medium leading-none text-[#71605A] sm:block">
        Good Food. Brighter Tomorrow.
      </div>
    </div>
  </Link>
);

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/browse", label: "Browse Food" },
  { to: "/#categories", label: "Categories" },
  { to: "/#impact", label: "Our Impact" },
  { to: "/#how-it-works", label: "How It Works" },
  { to: "/#about", label: "Who It's For" },
  { to: "/#about-us", label: "About Us" },
  { to: "/cart", label: "Cart" },
];

export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(getCartCount);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => subscribeToCart(() => setCartCount(getCartCount())), []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  // Scroll to the section named in the URL hash (React Router doesn't do this by itself).
  useEffect(() => {
    if (location.pathname !== "/") return;

    const timer = window.setTimeout(() => {
      const target = location.hash
        ? document.getElementById(location.hash.slice(1))
        : null;

      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }, 60);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  function isActive(to: string) {
    const [path, hash] = to.split("#");
    if (location.pathname !== (path || "/")) return false;
    return hash ? location.hash === `#${hash}` : to !== "/" || !location.hash;
  }

  // Clicking the section you're already on doesn't change the URL, so scroll manually.
  function handleNavClick(to: string) {
    setOpen(false);
    const hash = to.split("#")[1];

    if (hash && location.pathname === "/" && location.hash === `#${hash}`) {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const role = localStorage.getItem("role");
  const token = localStorage.getItem("access_token");

  const validRole =
    role === "customer" ||
    role === "business" ||
    role === "charity" ||
    role === "admin";

  const dashboardPath = token && validRole ? `/${role}` : null;
  const visibleNavLinks = token && role === "customer"
    ? [
        { to: "/customer", label: "Home" },
        { to: "/browse", label: "Browse Food" },
        { to: "/smart-basket", label: "Smart Basket" },
        { to: "/orders", label: "My Orders" },
      ]
    : navLinks.filter((link) => link.to !== "/cart");

  return (
    <header className="sticky top-0 z-50 border-b border-[#EEDFD3]/80 bg-[#FFF9EE]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {visibleNavLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => handleNavClick(link.to)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive(link.to)
                  ? "bg-[#FFF0E5] text-[#C9472E]"
                  : "text-[#3A2925]/80 hover:bg-[#FFF0E5] hover:text-[#C9472E]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {dashboardPath && role === "customer" ? (
            <>
              <Link to="/cart" aria-label={`Cart with ${cartCount} items`} className="relative rounded-xl border border-[#EEDFD3] bg-white p-2.5 text-[#E85D3F] hover:border-[#E85D3F] hover:text-[#C9472E]">
                <ShoppingCart size={20} />
                {cartCount > 0 && <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E85D3F] px-1 text-[10px] font-bold text-white">{cartCount > 99 ? "99+" : cartCount}</span>}
              </Link>
              <button type="button" aria-label="Sign out" title="Sign out" onClick={async () => { await logout(); navigate("/", { replace: true }); }} className="rounded-xl border border-[#EEDFD3] bg-white p-2.5 text-[#E85D3F] hover:border-[#E85D3F] hover:text-[#C9472E]">
                <LogOut size={20} />
              </button>
            </>
          ) : dashboardPath ? (
            <Link
              to={dashboardPath}
              className="rounded-xl bg-[#E85D3F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C9472E]"
            >
              My Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl border border-[#EEDFD3] bg-white px-4 py-2 text-sm font-semibold text-[#3A2925] hover:border-[#E85D3F] hover:text-[#C9472E]"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="rounded-xl bg-[#E85D3F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C9472E]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="rounded-lg p-2 text-[#3A2925] hover:bg-[#FFF0E5] md:hidden"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {open ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#3A2925]/45 backdrop-blur-[2px]"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col overflow-y-auto bg-[#FFF9EE] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#EEDFD3] px-5 py-5">
              <Logo />
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EEDFD3] bg-white text-[#3A2925] hover:border-[#E85D3F] hover:text-[#C9472E]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav aria-label="Mobile navigation" className="flex-1 space-y-2 px-4 py-5">
              {visibleNavLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => handleNavClick(link.to)}
                  className={`block rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                    isActive(link.to)
                      ? "bg-[#FFF0E5] text-[#C9472E]"
                      : "text-[#3A2925] hover:bg-[#FFF0E5] hover:text-[#C9472E]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-[#EEDFD3] bg-white/60 p-4">
              {dashboardPath && role === "customer" ? (
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/cart" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 rounded-xl border border-[#E85D3F] py-3 text-sm font-semibold text-[#E85D3F]"><ShoppingCart size={18} /> Cart ({cartCount})</Link>
                  <button type="button" onClick={async () => { setOpen(false); await logout(); navigate("/", { replace: true }); }} className="flex items-center justify-center gap-2 rounded-xl bg-[#E85D3F] py-3 text-sm font-semibold text-white"><LogOut size={18} /> Sign out</button>
                </div>
              ) : dashboardPath ? (
                <Link to={dashboardPath} onClick={() => setOpen(false)} className="block w-full rounded-xl bg-[#E85D3F] py-3 text-center text-sm font-semibold text-white hover:bg-[#C9472E]">
                  My Dashboard
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/login" onClick={() => setOpen(false)} className="rounded-xl border border-[#EEDFD3] bg-white py-3 text-center text-sm font-semibold text-[#3A2925]">
                    Login
                  </Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="rounded-xl bg-[#E85D3F] py-3 text-center text-sm font-semibold text-white hover:bg-[#C9472E]">
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

