import { formatBytes, formatDate } from '@/lib/utils';
import type { StoredFile } from '@/types';

interface Props {
  file: StoredFile;
  /** Username of the signed-in user, to tell owned files from shared ones. */
  currentUsername: string;
  /** Whether this user may delete/share it — owner or system admin. */
  canManage: boolean;
  onDownload: (file: StoredFile) => void;
  onShare: (file: StoredFile) => void;
  onDelete: (file: StoredFile) => void;
}

/** Rough icon from the MIME type the backend recorded at upload. */
function iconFor(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️';
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return '📊';
  }
  if (mimeType.startsWith('text/') || mimeType.includes('document')) return '📝';
  return '📄';
}

/** A single card representing an uploaded file in the file manager. */
export default function FileCard({
  file,
  currentUsername,
  canManage,
  onDownload,
  onShare,
  onDelete,
}: Props) {
  const isOwn = file.owner === currentUsername;

  return (
    <div className="card flex flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none">{iconFor(file.file_type)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900" title={file.original_name}>
            {file.original_name}
          </p>
          <p className="text-xs text-slate-500">
            {formatBytes(file.file_size)} · {formatDate(file.uploaded_at)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {/* Set by the encryption layer server-side, never by this client. */}
        {file.is_encrypted && (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            🔒 Encrypted
          </span>
        )}
        {!isOwn && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            👥 Shared by {file.owner}
          </span>
        )}
        {file.folder_name && (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            📁 {file.folder_name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
        <button
          onClick={() => onDownload(file)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Download
        </button>
        {/* Sharing and deleting are owner/admin-only server-side, so the
            buttons only appear for users who would actually be allowed. */}
        {canManage && (
          <>
            <button
              onClick={() => onShare(file)}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Share
            </button>
            <button
              onClick={() => onDelete(file)}
              className="ml-auto text-sm font-medium text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
