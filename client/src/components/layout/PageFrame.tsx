import type { ReactNode } from "react";
import PublicHeader from "./PublicHeader";
import Footer from "./Footer";

export default function PageFrame({ children, hideFooter = false }: { children: ReactNode; hideFooter?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FFF9EE]">
      <PublicHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      {!hideFooter && <Footer />}
    </div>
  );
}
