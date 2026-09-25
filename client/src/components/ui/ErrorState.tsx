import { TriangleAlert } from 'lucide-react';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#EEDFD3] bg-[#FFF9EE] px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF0E5] text-[#E85D3F]">
        <TriangleAlert size={22} />
      </div>
      <p className="max-w-sm text-sm text-[#71605A]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-xl border border-[#EEDFD3] bg-white px-5 py-2 text-sm font-semibold text-[#3A2925] hover:border-[#E85D3F] hover:text-[#C9472E]"
        >
          Try again
        </button>
      )}
    </div>
  );
}
