import { useEffect, useState } from 'react';
import { createFolder, deleteFile, downloadFile, listFiles } from '@/api/files';
import { getErrorMessage } from '@/lib/utils';
import FileCard from '@/components/FileCard';
import UploadModal from '@/components/UploadModal';
import ShareModal from '@/components/ShareModal';
import Spinner from '@/components/Spinner';
import type { FileItem } from '@/types';

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<FileItem | null>(null);

  // Current folder (null = root). Folder navigation is wired but starts at root.
  const folderId = null;

  useEffect(() => {
    listFiles(folderId)
      .then(setFiles)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [folderId]);

  async function handleNewFolder() {
    const name = window.prompt('Folder name?');
    if (!name?.trim()) return;
    try {
      const folder = await createFolder(name.trim(), folderId);
      setFiles((prev) => [folder, ...prev]);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete(file: FileItem) {
    if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    try {
      await deleteFile(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function handleShared(updated: FileItem) {
    setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }

  const visible = files.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">My Files</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleNewFolder}>
            📁 New folder
          </button>
          <button className="btn-primary" onClick={() => setUploadOpen(true)}>
            📤 Upload
          </button>
        </div>
      </div>

      <input
        type="search"
        className="input max-w-sm"
        placeholder="Search files…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : visible.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-4xl">📂</span>
          <p className="font-medium text-slate-700">No files found</p>
          <p className="text-sm text-slate-500">Upload a file to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDownload={(f) => downloadFile(f.id, f.name)}
              onShare={(f) => setShareTarget(f)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        folderId={folderId}
        onClose={() => setUploadOpen(false)}
        onUploaded={(file) => setFiles((prev) => [file, ...prev])}
      />
      <ShareModal
        file={shareTarget}
        onClose={() => setShareTarget(null)}
        onShared={handleShared}
      />
    </div>
  );
}
