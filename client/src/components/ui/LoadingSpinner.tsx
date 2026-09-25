export default function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16" role="status">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#EEDFD3] border-t-[#E85D3F]" />
      <p className="text-sm font-medium text-[#71605A]">{message}</p>
    </div>
  );
}
