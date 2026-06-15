import { cn } from '@/lib/utils';

export default function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600',
        className,
      )}
    />
  );
}
