// Shared domain types for the Secure File Sharing app.
// Keep these in sync with the backend API contract (Member 2).

export type Role = 'ADMIN' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

/** Result of a background virus/malware scan (parallel computing feature). */
export type ScanStatus = 'pending' | 'clean' | 'infected';

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  /** Size in bytes (0 for folders). */
  size: number;
  mimeType?: string;
  ownerId: string;
  ownerName: string;
  /** Parent folder id, or null when at the root. */
  folderId: string | null;
  /** Emails this item is shared with. */
  sharedWith: string[];
  /** Whether the file is stored encrypted at rest. */
  encrypted: boolean;
  scanStatus: ScanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

/** Standard shape the UI uses when surfacing API errors. */
export interface ApiError {
  message: string;
}
