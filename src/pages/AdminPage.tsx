import { useEffect, useState } from 'react';
import { listUsers, updateUserRole } from '@/api/auth';
import { listAllLogs } from '@/api/activity';
import { useAuth } from '@/context/AuthContext';
import { cn, formatDate, getErrorMessage, roleLabel } from '@/lib/utils';
import ActivityTable from '@/components/ActivityTable';
import RoleBadge from '@/components/RoleBadge';
import Spinner from '@/components/Spinner';
import { ROLE_NAMES, type ActivityLog, type ApiUser, type RoleName } from '@/types';

type Tab = 'users' | 'logs';

/**
 * Admin console. The route is gated to `admin`, and both endpoints it uses
 * (`/accounts/users/` and `/activity/logs/`) enforce that server-side as well.
 */
export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [userList, logList] = await Promise.all([listUsers(), listAllLogs()]);
        setUsers(userList);
        setLogs(logList);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleRoleChange(target: ApiUser, role: RoleName) {
    if (role === target.role?.name) return;

    setSavingId(target.id);
    setError('');
    try {
      const updated = await updateUserRole(target.id, role);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      // The change is itself an audited admin action — pull the log back in.
      setLogs(await listAllLogs());
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update that role'));
    } finally {
      setSavingId(null);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'users', label: `Users (${users.length})` },
    { key: 'logs', label: `Activity log (${logs.length})` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Console</h1>
        <p className="text-sm text-slate-500">
          Manage roles and review the system-wide audit trail.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 sm:w-fit">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              tab === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : tab === 'users' ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Change role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ');
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {u.username}
                      {isSelf && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fullName || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="input py-1 text-xs"
                        value={u.role?.name ?? ''}
                        disabled={isSelf || savingId === u.id}
                        // Locked for your own account: demoting yourself out of
                        // `admin` would immediately revoke access to this page.
                        title={isSelf ? 'You cannot change your own role' : undefined}
                        onChange={(e) => handleRoleChange(u, e.target.value as RoleName)}
                      >
                        {u.role === null && <option value="">No role</option>}
                        {ROLE_NAMES.map((name) => (
                          <option key={name} value={name}>
                            {roleLabel(name)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <ActivityTable logs={logs} showUser />
      )}
    </div>
  );
}
