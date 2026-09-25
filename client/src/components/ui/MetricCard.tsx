interface Props {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sublabel?: string;
  trend?: string;
}

export default function MetricCard({ icon, value, label, sublabel, trend }: Props) {
  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-[#EEDFD3] bg-white p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0E5] text-[#C9472E] transition-colors group-hover:bg-[#E85D3F] group-hover:text-white">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-display text-2xl font-bold leading-tight text-[#3A2925]">{value}</div>
        <div className="text-sm font-medium text-[#71605A]">{label}</div>
        {sublabel && <div className="text-xs text-[#C9472E]">{sublabel}</div>}
        {trend && <div className="text-xs font-semibold text-[#C9472E]">↑ {trend}</div>}
      </div>
    </div>
  );
}
