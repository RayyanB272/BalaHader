interface Props {
  children: React.ReactNode;
  variant?: 'green' | 'orange' | 'blue' | 'gray' | 'red' | 'yellow';
  size?: 'sm' | 'md';
}

const variants = {
  green: 'bg-[#FFF0E5] text-[#C9472E] ring-[#E85D3F]/20',
  orange: 'bg-[#FFF6DD] text-[#8A5A00] ring-[#F6B73C]/40',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  gray: 'bg-[#FFF0E5] text-[#71605A] ring-[#71605A]/20',
  red: 'bg-red-50 text-red-700 ring-red-600/15',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

export default function Badge({ children, variant = 'green', size = 'sm' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset ${variants[variant]} ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {children}
    </span>
  );
}
