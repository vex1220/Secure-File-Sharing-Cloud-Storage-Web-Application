import { useEffect, useState } from 'react';
import { clearAuditEntries, getAuditEntries, type SecurityAuditEvent } from '@/lib/security';
import { formatDateTime } from '@/lib/utils';

export default function SecurityAuditPanel() {
  const [events, setEvents] = useState<SecurityAuditEvent[]>([]);

  useEffect(() => {
    const refresh = () => setEvents(getAuditEntries());
    refresh();
    window.addEventListener('sfs:audit-updated', refresh);
    return () => window.removeEventListener('sfs:audit-updated', refresh);
  }, []);

  function handleClear() {
    clearAuditEntries();
    setEvents([]);
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Security audit trail</h2>
          <p className="text-sm text-slate-500">Recent upload, download, validation, and background-task events.</p>
        </div>
        <button className="text-sm font-medium text-slate-600 hover:text-slate-900" onClick={handleClear}>
          Clear
        </button>
      </div>

      {events.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No security events recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-800">{event.message}</p>
                <span className="text-xs capitalize text-slate-500">{event.severity}</span>
              </div>
              {event.detail && <p className="mt-1 text-xs text-slate-500">{event.detail}</p>}
              <p className="mt-1 text-xs text-slate-400">{formatDateTime(event.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
