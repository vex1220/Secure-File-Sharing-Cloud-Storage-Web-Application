import { cn } from '@/lib/utils';
import type { Role } from '@/types';

/** Small colored pill showing a user's role (used in navbar, admin table). */
export default function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        role === 'ADMIN'
          ? 'bg-purple-100 text-purple-700'
          : 'bg-slate-100 text-slate-600',
      )}
    >
      {role}
    </span>
  );
}
