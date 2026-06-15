import { apiClient, USE_MOCK } from '@/api/client';
import { mockApi } from '@/api/mock';
import type { FileItem } from '@/types';

/**
 * File API calls. Mirrors the auth module pattern: mock branch for offline UI
 * development, axios branch for the live backend.
 */

export async function listFiles(folderId: string | null = null): Promise<FileItem[]> {
  if (USE_MOCK) return mockApi.listFiles(folderId);
  const { data } = await apiClient.get<FileItem[]>('/files', { params: { folderId } });
  return data;
}

export async function uploadFile(
  file: File,
  folderId: string | null = null,
  onProgress?: (percent: number) => void,
): Promise<FileItem> {
  if (USE_MOCK) {
    onProgress?.(100);
    return mockApi.uploadFile(file, folderId);
  }
  const form = new FormData();
  form.append('file', file);
  if (folderId) form.append('folderId', folderId);

  const { data } = await apiClient.post<FileItem>('/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
}

export async function createFolder(
  name: string,
  folderId: string | null = null,
): Promise<FileItem> {
  if (USE_MOCK) return mockApi.createFolder(name, folderId);
  const { data } = await apiClient.post<FileItem>('/files/folder', { name, folderId });
  return data;
}

export async function shareFile(fileId: string, email: string): Promise<FileItem> {
  if (USE_MOCK) return mockApi.shareFile(fileId, email);
  const { data } = await apiClient.post<FileItem>(`/files/${fileId}/share`, { email });
  return data;
}

export async function deleteFile(fileId: string): Promise<void> {
  if (USE_MOCK) return mockApi.deleteFile(fileId);
  await apiClient.delete(`/files/${fileId}`);
}

/** Trigger a browser download of a file's contents. */
export async function downloadFile(fileId: string, fileName: string): Promise<void> {
  if (USE_MOCK) {
    // No real bytes in mock mode — hand back a small placeholder file.
    const blob = new Blob([`Mock contents of ${fileName}`], { type: 'text/plain' });
    triggerDownload(blob, fileName);
    return;
  }
  const { data } = await apiClient.get<Blob>(`/files/${fileId}/download`, {
    responseType: 'blob',
  });
  triggerDownload(data, fileName);
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
