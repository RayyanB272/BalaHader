import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, HeartHandshake, Leaf, Store } from "lucide-react";
import BrandIcon from "../ui/BrandIcon";

const points = [
  { icon: Leaf, title: "Save quality food", text: "Surplus meals at a fraction of the price." },
  { icon: Store, title: "Help local businesses", text: "Turn unsold food into revenue, not waste." },
  { icon: HeartHandshake, title: "Support Tripoli", text: "Donations reach families who need them." },
];

export default function AuthLayout({
  heading,
  text,
  children,
  wide = false,
}: {
  heading: string;
  text: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#FFF9EE] lg:grid lg:h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:overflow-hidden">
      <aside className="relative hidden overflow-hidden bg-[#3A2925] p-12 text-white lg:flex lg:h-screen lg:flex-col lg:justify-between xl:p-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#E85D3F]/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full border-[48px] border-white/5" />

        <Link to="/" className="relative flex items-center gap-3">
          <BrandIcon size="lg" className="ring-1 ring-white/15" />
          <span className="font-display text-2xl font-bold">BalaHader</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight xl:text-5xl [@media(max-height:780px)]:text-3xl">{heading}</h2>
          <p className="mt-5 text-lg leading-relaxed text-[#F0DFD2]">{text}</p>

          <ul className="mt-10 space-y-5 [@media(max-height:780px)]:hidden">
            {points.map(({ icon: Icon, title, text: body }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#F6B73C]">
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="text-sm text-[#E3CFC2]">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-[#C9B3A6]">Good Food. Brighter Tomorrow.</p>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:h-screen lg:min-h-0 lg:overflow-y-auto">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-[#3A2925] lg:hidden">
            <BrandIcon size="sm" /> BalaHader
          </Link>
          <Link
            to="/"
            className="ml-auto flex items-center gap-1.5 text-sm font-medium text-[#71605A] hover:text-[#C9472E]"
          >
            <ArrowLeft size={16} /> Back to home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className={`w-full ${wide ? "max-w-2xl" : "max-w-xl"}`}>{children}</div>
        </div>
      </main>
    </div>
  );
}
