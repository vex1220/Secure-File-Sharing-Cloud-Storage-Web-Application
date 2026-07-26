import { apiClient } from '@/api/client';
import type { ActivityLog } from '@/types';

/**
 * Activity log endpoints (`/api/activity/...`).
 *
 * Entries are written server-side on register, login, upload, download, delete,
 * share, revoke and role changes, and come back newest-first (the model's
 * `Meta.ordering`).
 */
export async function listMyLogs(): Promise<ActivityLog[]> {
  const { data } = await apiClient.get<ActivityLog[]>('/activity/logs/me/');
  return data;
}

/** Every user's activity. Returns 403 for anyone who is not a system admin. */
export async function listAllLogs(): Promise<ActivityLog[]> {
  const { data } = await apiClient.get<ActivityLog[]>('/activity/logs/');
  return data;
}
