import { cn, formatDateTime } from '@/lib/utils';
import type { ActivityAction, ActivityLog } from '@/types';

interface Props {
  logs: ActivityLog[];
  /** Show the "User" column — useful for the admin-wide log, noise for your own. */
  showUser?: boolean;
}

const actionStyles: Record<ActivityAction, string> = {
  register: 'bg-blue-100 text-blue-700',
  login: 'bg-slate-100 text-slate-600',
  logout: 'bg-slate-100 text-slate-600',
  upload: 'bg-emerald-100 text-emerald-700',
  download: 'bg-sky-100 text-sky-700',
  delete: 'bg-red-100 text-red-700',
  share: 'bg-violet-100 text-violet-700',
  permission_change: 'bg-amber-100 text-amber-700',
  admin_action: 'bg-purple-100 text-purple-700',
  other: 'bg-slate-100 text-slate-600',
};

export function ActionBadge({ action }: { action: ActivityAction }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        actionStyles[action] ?? actionStyles.other,
      )}
    >
      {action.replace(/_/g, ' ')}
    </span>
  );
}

/** Audit-log table shared by the Activity page and the admin view. */
export default function ActivityTable({ logs, showUser = false }: Props) {
  if (logs.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 py-16 text-center">
        <span className="text-4xl">📋</span>
        <p className="font-medium text-slate-700">No activity recorded</p>
        <p className="text-sm text-slate-500">Actions appear here as they happen.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Action</th>
            {showUser && <th className="px-4 py-3 font-medium">User</th>}
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">IP</th>
            <th className="px-4 py-3 font-medium whitespace-nowrap">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <ActionBadge action={log.action} />
              </td>
              {showUser && (
                <td className="px-4 py-3 font-medium text-slate-800">
                  {log.user ?? <span className="text-slate-400">deleted user</span>}
                </td>
              )}
              <td className="px-4 py-3 text-slate-600">{log.description}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">
                {log.ip_address ?? '—'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                {formatDateTime(log.timestamp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
