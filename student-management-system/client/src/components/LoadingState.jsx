import { Loader2 } from 'lucide-react';

export function Spinner({ className = 'h-4 w-4' }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden="true" />;
}

// Shown instead of a blank area while data is loading
export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-sm text-slate-500"
      role="status"
    >
      <Spinner className="h-6 w-6 text-brand-600" />
      {message}
    </div>
  );
}
