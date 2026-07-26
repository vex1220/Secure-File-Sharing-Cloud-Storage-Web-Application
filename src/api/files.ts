import axios from 'axios';
import { apiClient } from '@/api/client';
import type { StoredFile } from '@/types';

/**
 * File endpoints (`/api/storage/files/...`).
 *
 * `GET /files/` returns every file the user owns *or* has been given permission
 * to, in one flat list — there is no folder query parameter — so the UI filters
 * by `file.folder` client-side when navigating into a folder.
 */
export async function listFiles(): Promise<StoredFile[]> {
  const { data } = await apiClient.get<StoredFile[]>('/storage/files/');
  return data;
}

/** Metadata for a single file. 403 if the user has no access to it. */
export async function getFile(fileId: number): Promise<StoredFile> {
  const { data } = await apiClient.get<StoredFile>(`/storage/files/${fileId}/`);
  return data;
}

/**
 * Upload a file into an optional folder.
 *
 * Rejects with 403 when the caller's role is `read_only`, which is why the UI
 * hides the upload controls for that role.
 */
export async function uploadFile(
  file: File,
  folderId: number | null = null,
  onProgress?: (percent: number) => void,
): Promise<StoredFile> {
  const form = new FormData();
  form.append('file', file);
  if (folderId !== null) form.append('folder', String(folderId));

  const { data } = await apiClient.post<StoredFile>('/storage/files/upload/', form, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
  return data;
}

/** Delete a file and its bytes. Owner or system admin only. */
export async function deleteFile(fileId: number): Promise<void> {
  await apiClient.delete(`/storage/files/${fileId}/delete/`);
}

/** Stream a file down and hand it to the browser as a save dialog. */
export async function downloadFile(file: StoredFile): Promise<void> {
  try {
    const { data } = await apiClient.get<Blob>(`/storage/files/${file.id}/download/`, {
      responseType: 'blob',
    });
    saveBlob(data, file.original_name);
  } catch (err) {
    throw await readBlobError(err);
  }
}

/**
 * Turn a failed blob request into a readable error.
 *
 * With `responseType: 'blob'` axios hands back the *error* body as a Blob too,
 * so `error.response.data.detail` is undefined and the UI would show a generic
 * message instead of, say, "File content is missing on the server." (410).
 */
async function readBlobError(err: unknown): Promise<unknown> {
  if (!axios.isAxiosError(err) || !(err.response?.data instanceof Blob)) return err;

  try {
    const parsed = JSON.parse(await err.response.data.text());
    err.response.data = parsed;
  } catch {
    // Not JSON — leave the original error untouched.
  }
  return err;
}

function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
