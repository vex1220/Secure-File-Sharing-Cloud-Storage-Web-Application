// Shared domain types for the Secure File Sharing app.
//
// These mirror the Django REST Framework serializers in the backend repo
// one-for-one, including snake_case field names, so a response can be dropped
// straight into these types with no translation layer:
//   accounts/serializers.py  -> Role, ApiUser
//   storage/serializers.py   -> StoredFile, Folder, FilePermission
//   activity/serializers.py  -> ActivityLog

/** Role names as stored in the backend `Role.name` column. */
export type RoleName = 'group_leader' | 'write_only' | 'read_only' | 'admin';

export const ROLE_NAMES: RoleName[] = ['read_only', 'write_only', 'group_leader', 'admin'];

/** Human-readable labels for the role names above. */
export const ROLE_LABELS: Record<RoleName, string> = {
  group_leader: 'Group Leader',
  write_only: 'Write Only',
  read_only: 'Read Only',
  admin: 'Admin',
};

/** Nested role object returned by RoleSerializer. */
export interface Role {
  id: number;
  name: RoleName;
  description: string;
}

/**
 * UserSerializer. `role` is nullable because `User.role` is
 * `on_delete=SET_NULL, null=True` — a user with no role can do almost nothing.
 */
export interface ApiUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role | null;
  created_at: string;
}

/**
 * FileSerializer. Named `StoredFile` so it never collides with the DOM `File`
 * type used for uploads.
 *
 * Note `owner` is a `StringRelatedField` — it is the owner's *username*, not an
 * id, so ownership is compared by username throughout the UI.
 */
export interface StoredFile {
  id: number;
  original_name: string;
  file_size: number;
  file_type: string;
  owner: string;
  /** Parent folder id, or null at the root. */
  folder: number | null;
  /**
   * Optional on purpose: `folder_name` is a read-only `CharField(source=
   * 'folder.name')`, so for a root-level file DRF hits None mid-traversal,
   * raises SkipField, and drops the key from the JSON entirely — it does not
   * serialize as null. Always treat it as possibly absent.
   */
  folder_name?: string | null;
  is_encrypted: boolean;
  uploaded_at: string;
  updated_at: string;
}

/** FolderSerializer. `owner` is a username string, same as StoredFile. */
export interface Folder {
  id: number;
  name: string;
  owner: string;
  parent: number | null;
  created_at: string;
  updated_at: string;
}

export type PermissionLevel = 'owner' | 'editor' | 'viewer';

export const PERMISSION_LEVELS: PermissionLevel[] = ['viewer', 'editor', 'owner'];

/**
 * FilePermissionSerializer.
 *
 * Heads-up: `user` and `granted_by` are `StringRelatedField`s, so this record
 * carries the recipient's *username* but not their numeric id — while the
 * revoke endpoint is keyed by id (`DELETE .../permissions/<user_id>/`). See
 * `resolveUserId` in `src/api/permissions.ts` for how the UI bridges that gap.
 */
export interface FilePermission {
  id: number;
  file: number;
  user: string;
  permission_level: PermissionLevel;
  granted_by: string | null;
  granted_at: string;
}

/** ActivityLog action types, from `activity.models.ActivityLog.ACTION_CHOICES`. */
export type ActivityAction =
  | 'register'
  | 'login'
  | 'logout'
  | 'upload'
  | 'download'
  | 'delete'
  | 'share'
  | 'permission_change'
  | 'admin_action'
  | 'other';

/** ActivityLogSerializer. `user` is a username string and is null for deleted users. */
export interface ActivityLog {
  id: number;
  user: string | null;
  action: ActivityAction;
  description: string;
  ip_address: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
}

/** The JWT pair returned by `POST /accounts/login/`. */
export interface TokenPair {
  access: string;
  refresh: string;
}
