import { cn, roleLabel } from '@/lib/utils';
import type { Role, RoleName } from '@/types';

const styles: Record<RoleName, string> = {
  admin: 'bg-purple-100 text-purple-700',
  group_leader: 'bg-blue-100 text-blue-700',
  write_only: 'bg-emerald-100 text-emerald-700',
  read_only: 'bg-slate-100 text-slate-600',
};

/** Small colored pill showing a user's role (navbar, admin table). */
export default function RoleBadge({ role }: { role: Role | RoleName | null }) {
  const name = typeof role === 'string' ? role : role?.name;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        name ? styles[name] : 'bg-amber-100 text-amber-700',
      )}
    >
      {roleLabel(role)}
    </span>
  );
}
