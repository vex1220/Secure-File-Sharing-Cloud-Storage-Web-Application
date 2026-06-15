import { cn, formatBytes, formatDate } from '@/lib/utils';
import type { FileItem, ScanStatus } from '@/types';

interface Props {
  file: FileItem;
  onOpen?: (file: FileItem) => void;
  onDownload?: (file: FileItem) => void;
  onShare?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
}

const scanStyles: Record<ScanStatus, string> = {
  clean: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  infected: 'bg-red-100 text-red-700',
};

function FileIcon({ file }: { file: FileItem }) {
  const emoji = file.type === 'folder' ? '📁' : '📄';
  return <span className="text-3xl leading-none">{emoji}</span>;
}

/** A single row/card representing a file or folder in the file manager. */
export default function FileCard({ file, onOpen, onDownload, onShare, onDelete }: Props) {
  const isFolder = file.type === 'folder';

  return (
    <div className="card flex flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onOpen?.(file)}
          className="flex flex-1 items-start gap-3 text-left"
        >
          <FileIcon file={file} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-500">
              {isFolder ? 'Folder' : formatBytes(file.size)} · {formatDate(file.updatedAt)}
            </p>
          </div>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {file.encrypted && (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            🔒 Encrypted
          </span>
        )}
        {!isFolder && (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              scanStyles[file.scanStatus],
            )}
          >
            {file.scanStatus === 'pending' ? '⏳ Scanning' : `Scan: ${file.scanStatus}`}
          </span>
        )}
        {file.sharedWith.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            👥 Shared ({file.sharedWith.length})
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
        {!isFolder && (
          <button
            onClick={() => onDownload?.(file)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Download
          </button>
        )}
        <button
          onClick={() => onShare?.(file)}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Share
        </button>
        <button
          onClick={() => onDelete?.(file)}
          className="ml-auto text-sm font-medium text-red-600 hover:text-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
