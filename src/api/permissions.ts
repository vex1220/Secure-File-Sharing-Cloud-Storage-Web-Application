import { apiClient } from '@/api/client';
import { listUsers } from '@/api/auth';
import type { FilePermission, PermissionLevel } from '@/types';

/**
 * File sharing endpoints (`/api/storage/files/<id>/permissions/...`).
 * Only the file's owner or a system admin may read or change these.
 */
export async function listPermissions(fileId: number): Promise<FilePermission[]> {
  const { data } = await apiClient.get<FilePermission[]>(
    `/storage/files/${fileId}/permissions/`,
  );
  return data;
}

/**
 * Share a file with another user by username.
 *
 * Re-sharing with someone who already has access updates their level
 * (`update_or_create` server-side), so this doubles as "change permission".
 */
export async function shareFile(
  fileId: number,
  username: string,
  permissionLevel: PermissionLevel = 'viewer',
): Promise<FilePermission> {
  const { data } = await apiClient.post<FilePermission>(
    `/storage/files/${fileId}/permissions/`,
    { username, permission_level: permissionLevel },
  );
  return data;
}

/** Revoke a user's access. Keyed by the recipient's numeric id, not username. */
export async function revokePermission(fileId: number, userId: number): Promise<void> {
  await apiClient.delete(`/storage/files/${fileId}/permissions/${userId}/`);
}

// --- username -> id resolution ---------------------------------------------
//
// There is a gap in the current API: `FilePermissionSerializer` renders `user`
// with a `StringRelatedField`, so a permission record identifies its recipient
// by username, while `revokePermission` above needs the numeric id. Nothing in
// the share response carries that id.
//
// The only endpoint that maps usernames to ids is `GET /accounts/users/`, and
// it is admin-only. So revoking works for admins, and for everyone else the UI
// disables the button and explains why (see ShareModal).
//
// The backend fix is one line — adding a `user_id` field to
// FilePermissionSerializer — after which this whole section can go away.

let userIdCache: Map<string, number> | null = null;
let cacheLoad: Promise<Map<string, number> | null> | null = null;

async function loadUserIds(): Promise<Map<string, number> | null> {
  try {
    const users = await listUsers();
    userIdCache = new Map(users.map((user) => [user.username, user.id]));
    return userIdCache;
  } catch {
    // 403 for non-admins: no way to resolve ids from the client.
    return null;
  }
}

/** Resolve a username to its id, or null when the directory is unavailable. */
export async function resolveUserId(username: string): Promise<number | null> {
  if (userIdCache) return userIdCache.get(username) ?? null;

  cacheLoad ??= loadUserIds().finally(() => {
    cacheLoad = null;
  });
  const map = await cacheLoad;
  return map?.get(username) ?? null;
}

/** Drop the cached directory, e.g. after signing out. */
export function clearUserIdCache(): void {
  userIdCache = null;
}
