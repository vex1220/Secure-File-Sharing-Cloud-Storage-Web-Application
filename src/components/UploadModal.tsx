import { useRef, useState } from 'react';
import Modal from '@/components/Modal';
import Spinner from '@/components/Spinner';
import { uploadFile } from '@/api/files';
import { recordAuditEvent, validateUploadFile } from '@/lib/security';
import { formatBytes, getErrorMessage } from '@/lib/utils';
import type { StoredFile } from '@/types';

interface Props {
  open: boolean;
  /** Folder to upload into, or null for the root. */
  folderId: number | null;
  /** Name of that folder, shown so the destination is obvious. */
  folderName?: string;
  onClose: () => void;
  onUploaded: (file: StoredFile) => void;
}

export default function UploadModal({
  open,
  folderId,
  folderName,
  onClose,
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setSelected(null);
    setProgress(0);
    setBusy(false);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleClose() {
    if (busy) return;
    reset();
    onClose();
  }

  async function handleUpload() {
    if (!selected) return;

    const validation = validateUploadFile(selected);
    if (!validation.ok) {
      recordAuditEvent('validation', 'warning', 'Upload blocked by client validation', validation.error);
      setError(validation.error ?? 'Upload validation failed');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const uploaded = await uploadFile(selected, folderId, setProgress);
      recordAuditEvent('upload', 'info', 'Client-side encryption and validation completed', selected.name);
      onUploaded(uploaded);
      reset();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Upload failed'));
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Upload a file" onClose={handleClose}>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-blue-400 hover:bg-blue-50/50"
        >
          <span className="text-3xl">📤</span>
          <span className="text-sm font-medium break-all text-slate-700">
            {selected ? selected.name : 'Click to choose a file'}
          </span>
          {selected && (
            <span className="text-xs text-slate-500">{formatBytes(selected.size)}</span>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => setSelected(e.target.files?.[0] ?? null)}
        />

        <p className="text-xs text-slate-500">
          Uploading to {folderName ? <strong>{folderName}</strong> : 'the root folder'}.
        </p>
        <p className="text-xs text-blue-700">
          Files are validated, sanitized, and encrypted before they leave the browser.
        </p>

        {busy && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={handleClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary" disabled={!selected || busy} onClick={handleUpload}>
            {busy ? <Spinner className="h-4 w-4" /> : 'Upload'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
