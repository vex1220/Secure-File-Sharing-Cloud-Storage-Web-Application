import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { listFiles } from '@/api/files';
import { formatBytes, formatDate } from '@/lib/utils';
import Spinner from '@/components/Spinner';
import type { FileItem } from '@/types';

interface Stat {
  label: string;
  value: string;
  icon: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listFiles(null)
      .then(setFiles)
      .finally(() => setLoading(false));
  }, []);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const stats: Stat[] = [
    { label: 'Total items', value: String(files.length), icon: '🗂️' },
    { label: 'Storage used', value: formatBytes(totalSize), icon: '💾' },
    {
      label: 'Encrypted',
      value: String(files.filter((f) => f.encrypted).length),
      icon: '🔒',
    },
    {
      label: 'Shared',
      value: String(files.filter((f) => f.sharedWith.length > 0).length),
      icon: '👥',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {user?.name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-slate-500">Here's an overview of your secure storage.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="card p-5">
                <div className="text-2xl">{s.icon}</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{s.value}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <h2 className="font-semibold text-slate-900">Recent files</h2>
              <Link to="/files" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View all →
              </Link>
            </div>
            {files.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">No files yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {files.slice(0, 5).map((f) => (
                  <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl">{f.type === 'folder' ? '📁' : '📄'}</span>
                    <span className="flex-1 truncate text-sm font-medium text-slate-800">
                      {f.name}
                    </span>
                    <span className="hidden text-xs text-slate-500 sm:block">
                      {f.type === 'folder' ? '—' : formatBytes(f.size)}
                    </span>
                    <span className="hidden text-xs text-slate-400 md:block">
                      {formatDate(f.updatedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
