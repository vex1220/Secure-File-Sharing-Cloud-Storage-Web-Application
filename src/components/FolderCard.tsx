import { formatDate } from '@/lib/utils';
import type { Folder } from '@/types';

interface Props {
  folder: Folder;
  /** Number of files sitting directly in this folder. */
  fileCount: number;
  onOpen: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
}

/**
 * A folder tile. Folders come only from `GET /storage/folders/`, which is
 * already scoped to the caller, so every folder shown here is deletable.
 */
export default function FolderCard({ folder, fileCount, onOpen, onDelete }: Props) {
  return (
    <div className="card flex flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      <button onClick={() => onOpen(folder)} className="flex items-start gap-3 text-left">
        <span className="text-3xl leading-none">📁</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900" title={folder.name}>
            {folder.name}
          </p>
          <p className="text-xs text-slate-500">
            {fileCount} {fileCount === 1 ? 'file' : 'files'} · {formatDate(folder.created_at)}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
        <button
          onClick={() => onOpen(folder)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Open
        </button>
        <button
          onClick={() => onDelete(folder)}
          className="ml-auto text-sm font-medium text-red-600 hover:text-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
