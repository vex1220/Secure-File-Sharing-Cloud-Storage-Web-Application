import { apiClient } from '@/api/client';
import type { Folder } from '@/types';

/**
 * Folder endpoints (`/api/storage/folders/...`).
 *
 * Folders are owner-scoped: the list only ever contains folders the caller
 * created, and only the owner can delete one. Deleting a folder cascades to its
 * subfolders but leaves its files in place at the root, because `File.folder`
 * is `on_delete=SET_NULL`.
 */
export async function listFolders(): Promise<Folder[]> {
  const { data } = await apiClient.get<Folder[]>('/storage/folders/');
  return data;
}

export async function createFolder(name: string, parent: number | null = null): Promise<Folder> {
  const { data } = await apiClient.post<Folder>('/storage/folders/', { name, parent });
  return data;
}

export async function deleteFolder(folderId: number): Promise<void> {
  await apiClient.delete(`/storage/folders/${folderId}/delete/`);
}
