import { useState } from 'react';
import Modal from '@/components/Modal';
import Spinner from '@/components/Spinner';
import { shareFile } from '@/api/files';
import { getErrorMessage } from '@/lib/utils';
import type { FileItem } from '@/types';

interface Props {
  file: FileItem | null;
  onClose: () => void;
  onShared: (file: FileItem) => void;
}

export default function ShareModal({ file, onClose, onShared }: Props) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const updated = await shareFile(file.id, email.trim());
      onShared(updated);
      setEmail('');
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not share file'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!file} title={`Share "${file?.name ?? ''}"`} onClose={onClose}>
      <form onSubmit={handleShare} className="space-y-4">
        <div>
          <label className="label" htmlFor="share-email">
            Recipient email
          </label>
          <input
            id="share-email"
            type="email"
            required
            className="input"
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {file && file.sharedWith.length > 0 && (
          <div>
            <p className="label">Already shared with</p>
            <ul className="space-y-1">
              {file.sharedWith.map((e) => (
                <li key={e} className="text-sm text-slate-600">
                  • {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Spinner className="h-4 w-4" /> : 'Share'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
