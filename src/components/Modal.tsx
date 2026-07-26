import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'md' | 'lg';
}

/** Accessible, click-outside-to-close modal dialog. */
export default function Modal({ open, title, onClose, children, size = 'md' }: Props) {
  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn('card w-full p-6', size === 'lg' ? 'max-w-lg' : 'max-w-md')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="truncate pr-2 text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
