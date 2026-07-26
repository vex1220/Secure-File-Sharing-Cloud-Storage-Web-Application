import { useEffect, useMemo, useState } from 'react';
import { deleteFile, downloadFile, listFiles } from '@/api/files';
import { createFolder, deleteFolder, listFolders } from '@/api/folders';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/utils';
import FileCard from '@/components/FileCard';
import FolderCard from '@/components/FolderCard';
import UploadModal from '@/components/UploadModal';
import ShareModal from '@/components/ShareModal';
import Spinner from '@/components/Spinner';
import type { Folder, StoredFile } from '@/types';

type Scope = 'all' | 'mine' | 'shared';

const scopes: { key: Scope; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'My files' },
  { key: 'shared', label: 'Shared with me' },
];

export default function FilesPage() {
  const { user, canUpload, isSystemAdmin } = useAuth();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<StoredFile | null>(null);

  const username = user?.username ?? '';

  useEffect(() => {
    async function load() {
      try {
        // Independent endpoints — fetch together rather than in sequence.
        const [fileList, folderList] = await Promise.all([listFiles(), listFolders()]);
        setFiles(fileList);
        setFolders(folderList);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /** Ids of folders this user actually owns — the only ones they can navigate. */
  const ownFolderIds = useMemo(() => new Set(folders.map((f) => f.id)), [folders]);

  /**
   * Which folder a file appears in *for this user*.
   *
   * A file shared with you keeps the owner's `folder` id, and that folder is
   * not in your own folder list — so without this mapping such files would
   * belong to a folder you cannot open and would never be visible. Anything
   * filed under an unreachable folder surfaces at your root instead.
   */
  const effectiveFolderId = (file: StoredFile): number | null =>
    file.folder !== null && ownFolderIds.has(file.folder) ? file.folder : null;

  const breadcrumbs = useMemo(() => {
    const trail: Folder[] = [];
    const byId = new Map(folders.map((f) => [f.id, f]));
    let cursor = currentFolderId === null ? undefined : byId.get(currentFolderId);
    // Walk up the parent chain, guarding against a cycle in bad data.
    while (cursor && trail.length <= folders.length) {
      trail.unshift(cursor);
      cursor = cursor.parent === null ? undefined : byId.get(cursor.parent);
    }
    return trail;
  }, [folders, currentFolderId]);

  const visibleFolders = useMemo(
    () =>
      folders
        .filter((folder) => folder.parent === currentFolderId)
        .filter((folder) => folder.name.toLowerCase().includes(query.toLowerCase())),
    [folders, currentFolderId, query],
  );

  const visibleFiles = useMemo(
    () =>
      files
        .filter((file) => effectiveFolderId(file) === currentFolderId)
        .filter((file) => {
          if (scope === 'mine') return file.owner === username;
          if (scope === 'shared') return file.owner !== username;
          return true;
        })
        .filter((file) => file.original_name.toLowerCase().includes(query.toLowerCase())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, currentFolderId, scope, query, username, ownFolderIds],
  );

  const fileCountFor = (folderId: number) =>
    files.filter((file) => file.folder === folderId).length;

  const currentFolder = breadcrumbs.at(-1) ?? null;

  async function handleNewFolder() {
    const name = window.prompt('Folder name?');
    if (!name?.trim()) return;
    setError('');
    try {
      const folder = await createFolder(name.trim(), currentFolderId);
      setFolders((prev) => [...prev, folder]);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDeleteFolder(folder: Folder) {
    const contained = fileCountFor(folder.id);
    const warning = contained
      ? `\n\n${contained} file(s) inside will move to your root folder, not be deleted.`
      : '';
    if (!window.confirm(`Delete the folder "${folder.name}"?${warning}`)) return;

    setError('');
    try {
      await deleteFolder(folder.id);
      const removed = new Set([folder.id]);
      // Subfolders cascade server-side; mirror that locally.
      let grew = true;
      while (grew) {
        grew = false;
        for (const candidate of folders) {
          if (candidate.parent !== null && removed.has(candidate.parent) && !removed.has(candidate.id)) {
            removed.add(candidate.id);
            grew = true;
          }
        }
      }
      setFolders((prev) => prev.filter((f) => !removed.has(f.id)));
      // `File.folder` is SET_NULL, so the files themselves survive at the root.
      setFiles((prev) =>
        prev.map((f) => (f.folder !== null && removed.has(f.folder)
          ? { ...f, folder: null, folder_name: null }
          : f)),
      );
      if (currentFolderId !== null && removed.has(currentFolderId)) setCurrentFolderId(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDeleteFile(file: StoredFile) {
    if (!window.confirm(`Delete "${file.original_name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await deleteFile(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDownload(file: StoredFile) {
    setError('');
    try {
      await downloadFile(file);
    } catch (err) {
      setError(getErrorMessage(err, 'Download failed'));
    }
  }

  const isEmpty = visibleFolders.length === 0 && visibleFiles.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">My Files</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleNewFolder}>
            📁 New folder
          </button>
          {/* Hidden for read_only users, whose uploads the API would reject. */}
          {canUpload && (
            <button className="btn-primary" onClick={() => setUploadOpen(true)}>
              📤 Upload
            </button>
          )}
        </div>
      </div>

      {!canUpload && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Your role does not permit uploading files. You can still download and view
          anything shared with you.
        </p>
      )}

      {/* Breadcrumb trail */}
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        <button
          onClick={() => setCurrentFolderId(null)}
          className={
            currentFolderId === null
              ? 'font-medium text-slate-900'
              : 'text-blue-600 hover:text-blue-700'
          }
        >
          Home
        </button>
        {breadcrumbs.map((folder, index) => (
          <span key={folder.id} className="flex items-center gap-1">
            <span className="text-slate-400">/</span>
            <button
              onClick={() => setCurrentFolderId(folder.id)}
              className={
                index === breadcrumbs.length - 1
                  ? 'font-medium text-slate-900'
                  : 'text-blue-600 hover:text-blue-700'
              }
            >
              {folder.name}
            </button>
          </span>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          className="input max-w-sm"
          placeholder="Search this folder…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {scopes.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setScope(key)}
              className={
                scope === key
                  ? 'rounded-md bg-white px-3 py-1 text-sm font-medium text-slate-900 shadow-sm'
                  : 'rounded-md px-3 py-1 text-sm font-medium text-slate-600 hover:text-slate-900'
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : isEmpty ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-4xl">📂</span>
          <p className="font-medium text-slate-700">Nothing here</p>
          <p className="text-sm text-slate-500">
            {query ? 'No results for that search.' : 'Upload a file or create a folder to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleFolders.map((folder) => (
            <FolderCard
              key={`folder-${folder.id}`}
              folder={folder}
              fileCount={fileCountFor(folder.id)}
              onOpen={(f) => {
                setCurrentFolderId(f.id);
                setQuery('');
              }}
              onDelete={handleDeleteFolder}
            />
          ))}
          {visibleFiles.map((file) => (
            <FileCard
              key={`file-${file.id}`}
              file={file}
              currentUsername={username}
              canManage={file.owner === username || isSystemAdmin}
              onDownload={handleDownload}
              onShare={setShareTarget}
              onDelete={handleDeleteFile}
            />
          ))}
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        folderId={currentFolderId}
        folderName={currentFolder?.name}
        onClose={() => setUploadOpen(false)}
        onUploaded={(file) => setFiles((prev) => [file, ...prev])}
      />
      <ShareModal file={shareTarget} onClose={() => setShareTarget(null)} />
    </div>
  );
}
