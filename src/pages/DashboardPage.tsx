import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { listFiles } from '@/api/files';
import { listFolders } from '@/api/folders';
import { listMyLogs } from '@/api/activity';
import SecurityAuditPanel from '@/components/SecurityAuditPanel';
import Spinner from '@/components/Spinner';
import { getAuditEntries } from '@/lib/security';
import { formatBytes, formatDate, formatDateTime, getErrorMessage, roleLabel } from '@/lib/utils';
import type { ActivityLog, StoredFile } from '@/types';

export default function DashboardPage() {
  const { user, displayName } = useAuth();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [folderCount, setFolderCount] = useState(0);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [auditCount, setAuditCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [fileList, folderList, logList] = await Promise.all([
          listFiles(),
          listFolders(),
          listMyLogs(),
        ]);
        setFiles(fileList);
        setFolderCount(folderList.length);
        setLogs(logList);
        setAuditCount(getAuditEntries().length);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const updateCount = () => setAuditCount(getAuditEntries().length);
    updateCount();
    window.addEventListener('sfs:audit-updated', updateCount);
    return () => window.removeEventListener('sfs:audit-updated', updateCount);
  }, []);

  const username = user?.username ?? '';
  const owned = files.filter((f) => f.owner === username);
  const sharedWithMe = files.filter((f) => f.owner !== username);
  const storageUsed = owned.reduce((sum, f) => sum + f.file_size, 0);

  const stats = [
    { label: 'My files', value: String(owned.length), icon: '🗂️' },
    { label: 'Storage used', value: formatBytes(storageUsed), icon: '💾' },
    { label: 'Shared with me', value: String(sharedWithMe.length), icon: '👥' },
    { label: 'Folders', value: String(folderCount), icon: '📁' },
  ];

  const recent = [...files]
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {displayName.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="text-sm text-slate-500">
          Signed in as <strong>{username}</strong> · {roleLabel(user?.role)}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="card p-5">
                <div className="text-2xl">{stat.icon}</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="card p-5">
              <div className="text-2xl">🔐</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{auditCount}</div>
              <div className="text-sm text-slate-500">Security events</div>
            </div>
            <div className="card p-5">
              <div className="text-2xl">🗂️</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{owned.length}</div>
              <div className="text-sm text-slate-500">My files</div>
            </div>
            <div className="card p-5">
              <div className="text-2xl">💾</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{formatBytes(storageUsed)}</div>
              <div className="text-sm text-slate-500">Storage used</div>
            </div>
            <div className="card p-5">
              <div className="text-2xl">👥</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{sharedWithMe.length}</div>
              <div className="text-sm text-slate-500">Shared with me</div>
            </div>
          </div>

          <SecurityAuditPanel />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <h2 className="font-semibold text-slate-900">Recent files</h2>
                <Link to="/files" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  View all →
                </Link>
              </div>
              {recent.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">No files yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recent.map((file) => (
                    <li key={file.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xl">{file.is_encrypted ? '🔒' : '📄'}</span>
                      <span
                        className="flex-1 truncate text-sm font-medium text-slate-800"
                        title={file.original_name}
                      >
                        {file.original_name}
                      </span>
                      <span className="hidden text-xs text-slate-500 sm:block">
                        {formatBytes(file.file_size)}
                      </span>
                      <span className="hidden text-xs text-slate-400 md:block">
                        {formatDate(file.uploaded_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <h2 className="font-semibold text-slate-900">Recent activity</h2>
                <Link
                  to="/activity"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View all →
                </Link>
              </div>
              {logs.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">Nothing logged yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {logs.slice(0, 5).map((log) => (
                    <li key={log.id} className="px-4 py-3">
                      <p className="truncate text-sm text-slate-800">{log.description}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(log.timestamp)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
