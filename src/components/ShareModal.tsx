import { useCallback, useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Spinner from '@/components/Spinner';
import {
  listPermissions,
  resolveUserId,
  revokePermission,
  shareFile,
} from '@/api/permissions';
import { getErrorMessage } from '@/lib/utils';
import { PERMISSION_LEVELS, type FilePermission, type PermissionLevel, type StoredFile } from '@/types';

interface Props {
  /** The file being shared, or null when the modal is closed. */
  file: StoredFile | null;
  onClose: () => void;
}

const levelHint: Record<PermissionLevel, string> = {
  viewer: 'Can view and download',
  editor: 'Can view, download and edit',
  owner: 'Full access to the file',
};

export default function ShareModal({ file, onClose }: Props) {
  const [permissions, setPermissions] = useState<FilePermission[]>([]);
  const [userIds, setUserIds] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [level, setLevel] = useState<PermissionLevel>('viewer');
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fileId = file?.id ?? null;

  const load = useCallback(async (id: number) => {
    setLoading(true);
    setError('');
    try {
      const perms = await listPermissions(id);
      setPermissions(perms);

      // Permission records name their recipient but carry no id, so look the
      // ids up separately — revoking needs them. Unavailable to non-admins.
      const resolved = await Promise.all(
        perms.map(async (perm) => [perm.user, await resolveUserId(perm.user)] as const),
      );
      setUserIds(
        Object.fromEntries(
          resolved.filter((entry): entry is [string, number] => entry[1] !== null),
        ),
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load sharing details'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fileId === null) return;
    setUsername('');
    setLevel('viewer');
    setNotice('');
    load(fileId);
  }, [fileId, load]);

  async function handleShare(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;

    setBusy(true);
    setError('');
    setNotice('');
    try {
      await shareFile(file.id, username.trim(), level);
      setNotice(`Shared with ${username.trim()}.`);
      setUsername('');
      await load(file.id);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not share this file'));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(perm: FilePermission) {
    if (!file) return;
    const userId = userIds[perm.user];
    if (userId === undefined) return;

    setRevoking(perm.user);
    setError('');
    setNotice('');
    try {
      await revokePermission(file.id, userId);
      setNotice(`Removed ${perm.user}'s access.`);
      await load(file.id);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not revoke access'));
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Modal
      open={file !== null}
      size="lg"
      title={`Share "${file?.original_name ?? ''}"`}
      onClose={onClose}
    >
      <form onSubmit={handleShare} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label className="label" htmlFor="share-username">
              Username
            </label>
            <input
              id="share-username"
              required
              className="input"
              placeholder="teammate"
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="sm:w-40">
            <label className="label" htmlFor="share-level">
              Access
            </label>
            <select
              id="share-level"
              className="input"
              value={level}
              onChange={(e) => setLevel(e.target.value as PermissionLevel)}
            >
              {PERMISSION_LEVELS.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-500">{levelHint[level]}</p>

        <button type="submit" className="btn-primary w-full" disabled={busy || !username.trim()}>
          {busy ? <Spinner className="h-4 w-4" /> : 'Share'}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <p className="label">People with access</p>

        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : permissions.length === 0 ? (
          <p className="py-2 text-sm text-slate-500">
            Not shared with anyone yet — only you can see this file.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {permissions.map((perm) => {
              const knownId = userIds[perm.user] !== undefined;
              return (
                <li key={perm.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{perm.user}</p>
                    <p className="text-xs text-slate-500">
                      {perm.permission_level}
                      {perm.granted_by && ` · added by ${perm.granted_by}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(perm)}
                    disabled={!knownId || revoking === perm.user}
                    title={
                      knownId
                        ? `Remove ${perm.user}'s access`
                        : "Revoking needs this user's numeric id, which the permissions endpoint does not return. Only admins can look it up."
                    }
                    className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    {revoking === perm.user ? '…' : 'Remove'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {notice && <p className="mt-3 text-sm text-emerald-600">{notice}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
