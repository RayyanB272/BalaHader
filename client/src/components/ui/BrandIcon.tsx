type BrandIconProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-14 w-14 rounded-2xl",
};

const leafClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

export default function BrandIcon({ size = "md", className = "" }: BrandIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center bg-[#3A2925] shadow-[0_6px_14px_-6px_rgba(58,41,37,0.65)] ${sizeClasses[size]} ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="#F6B73C" className={leafClasses[size]}>
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20c8 0 10-8 10-8s0 8-8 8a5.71 5.71 0 00-1.71.26L7.39 22H9c8 0 12-8 12-8s-2 4-4-6z" />
      </svg>
    </span>
  );
}
