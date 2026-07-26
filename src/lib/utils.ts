import axios from 'axios';
import { ROLE_LABELS, type Role, type RoleName } from '@/types';

/** Join class names, dropping falsy values. A tiny `clsx` replacement. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Human-readable file size, e.g. 1536 -> "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Short, locale-aware date, e.g. "Jun 15, 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Date plus time, for activity log rows. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Display label for a role, tolerating the null role the backend allows. */
export function roleLabel(role: Role | RoleName | null | undefined): string {
  if (!role) return 'No role';
  const name = typeof role === 'string' ? role : role.name;
  return ROLE_LABELS[name] ?? name;
}

/**
 * Pull a readable message out of a DRF error response.
 *
 * The backend answers in three shapes and this flattens all of them:
 *   - `{"detail": "You do not have access to this file."}` from the views
 *   - `{"username": ["A user with that username already exists."]}` field
 *     errors from a serializer
 *   - `{"non_field_errors": [...]}` for cross-field validation
 */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : fallback;
  }

  // The request never reached the server (backend down, wrong proxy target).
  if (!err.response) {
    return 'Cannot reach the server. Is the backend running?';
  }

  const data = err.response.data;
  if (typeof data === 'string' && data.trim()) return data;

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;

    if (typeof record.detail === 'string') return record.detail;

    const messages = Object.entries(record).flatMap(([field, value]) => {
      const texts = Array.isArray(value) ? value.map(String) : [String(value)];
      // Field name adds nothing for whole-form errors.
      return field === 'non_field_errors' ? texts : texts.map((t) => `${labelFor(field)}: ${t}`);
    });

    if (messages.length) return messages.join(' ');
  }

  return err.message || fallback;
}

/** "password_confirm" -> "Password confirm", for inline form errors. */
function labelFor(field: string): string {
  const spaced = field.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
