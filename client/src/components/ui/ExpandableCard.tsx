import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Eye, X } from "lucide-react";

interface Props {
  media?: ReactNode;
  header: ReactNode;
  details: ReactNode;
  children?: ReactNode;
}

export default function ExpandableCard({ media, header, details, children }: Props) {
  const [open, setOpen] = useState(false);
  const dialogTitleId = useId();

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <>
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
        <div
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="block w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E85D3F]"
        >
          {media}
          <div className="flex items-start gap-3 p-5 pb-4">
            <div className="min-w-0 flex-1">{header}</div>
            <span className="mt-0.5 flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#C9472E]">
              <Eye size={15} /> Details
            </span>
          </div>
        </div>

        {children && <div className="mt-auto px-5 pb-5">{children}</div>}
      </article>

      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:pl-72">
          <div className="absolute inset-0 bg-[#241815]/15 backdrop-blur-sm" onMouseDown={() => setOpen(false)} aria-hidden="true" />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            style={{ width: "min(440px, calc(100vw - 2rem))", maxHeight: "min(520px, calc(100dvh - 2rem))" }}
            className="relative z-10 flex overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white p-3 shadow-[0_30px_90px_rgba(36,24,21,0.32)]"
          >
            <div className="flex min-h-0 w-full flex-col">
              <div className="flex items-center justify-between gap-3 px-1 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#E85D3F]">Details</p>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close details" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EEDFD3] text-[#3A2925] hover:bg-[#FFF0E5]"><X size={18} /></button>
              </div>

              {media && <div className="h-24 shrink-0 overflow-hidden rounded-xl [&>*]:h-full [&>*]:w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover">{media}</div>}

              <div className="mt-3 min-h-0 overflow-y-auto px-1 pb-1 pr-2">
                <div id={dialogTitleId}>{header}</div>
                <div className="mt-4 border-t border-[#EEDFD3] pt-4 text-sm">{details}</div>
              </div>
            </div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
