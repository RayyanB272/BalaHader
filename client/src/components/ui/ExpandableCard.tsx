import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  /** Optional image/banner shown above the brief. */
  media?: ReactNode;
  /** Always-visible summary. Clicking it opens the details. */
  header: ReactNode;
  /** Revealed on click. */
  details: ReactNode;
  /** Always-visible footer, e.g. main action buttons. */
  children?: ReactNode;
}

export default function ExpandableCard({ media, header, details, children }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((value) => !value);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onKeyDown}
        className="block w-full cursor-pointer text-left"
      >
        {media}
        <div className="flex items-start gap-3 p-5 pb-4">
          <div className="min-w-0 flex-1">{header}</div>
          <span className="mt-0.5 flex shrink-0 items-center gap-1 text-xs font-semibold text-[#C9472E]">
            {open ? "Hide" : "Details"}
            <ChevronDown
              size={16}
              className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            />
          </span>
        </div>
      </div>

      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mx-5 border-t border-[#EEDFD3] py-4 text-sm">{details}</div>
        </div>
      </div>

      {children && <div className="px-5 pb-5">{children}</div>}
    </article>
  );
}
