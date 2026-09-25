interface Props {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon = '🌿', title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#EEDFD3] bg-white/60 px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF0E5] text-3xl ring-8 ring-[#FFF0E5]">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold text-[#3A2925]">{title}</h3>
      {description && <p className="max-w-sm text-sm text-[#71605A]">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 rounded-xl bg-[#E85D3F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#C9472E]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
