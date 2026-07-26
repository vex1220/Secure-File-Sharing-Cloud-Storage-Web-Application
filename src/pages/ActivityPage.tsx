import { useEffect, useMemo, useState } from 'react';
import { listMyLogs } from '@/api/activity';
import { getErrorMessage } from '@/lib/utils';
import ActivityTable from '@/components/ActivityTable';
import Spinner from '@/components/Spinner';
import type { ActivityLog } from '@/types';

/**
 * The signed-in user's audit trail, from `GET /activity/logs/me/`.
 * Admins get everyone's log on the Admin page instead.
 */
export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('all');

  useEffect(() => {
    listMyLogs()
      .then(setLogs)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  // Only offer filters for actions that actually appear in this log.
  const actions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs],
  );

  const visible = action === 'all' ? logs : logs.filter((log) => log.action === action);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Activity</h1>
        <p className="text-sm text-slate-500">
          Every action recorded against your account, newest first.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-600" htmlFor="action-filter">
              Filter
            </label>
            <select
              id="action-filter"
              className="input max-w-xs"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="all">All actions ({logs.length})</option>
              {actions.map((name) => (
                <option key={name} value={name}>
                  {name.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <ActivityTable logs={visible} />
        </>
      )}
    </div>
  );
}
