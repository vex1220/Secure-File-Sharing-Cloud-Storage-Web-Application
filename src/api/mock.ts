import type { AuthResponse, FileItem, User } from '@/types';

/**
 * In-memory backend stand-in. Lets Member 1 build and demo the entire UI
 * before the real API exists. State lives for the lifetime of the page.
 */

const now = () => new Date().toISOString();
const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// Demo accounts (any password is accepted in mock mode).
const USERS: User[] = [
  {
    id: 'u-admin',
    name: 'Admin User',
    email: 'admin@demo.com',
    role: 'ADMIN',
    createdAt: '2026-01-10T12:00:00.000Z',
  },
  {
    id: 'u-standard',
    name: 'Standard User',
    email: 'user@demo.com',
    role: 'USER',
    createdAt: '2026-02-22T12:00:00.000Z',
  },
];

let FILES: FileItem[] = [
  {
    id: 'f-1', name: 'Project Proposal.pdf', type: 'file', size: 248_000,
    mimeType: 'application/pdf', ownerId: 'u-standard', ownerName: 'Standard User',
    folderId: null, sharedWith: ['admin@demo.com'], encrypted: true,
    scanStatus: 'clean', createdAt: '2026-05-01T09:00:00.000Z', updatedAt: '2026-05-01T09:00:00.000Z',
  },
  {
    id: 'f-2', name: 'Lecture Notes', type: 'folder', size: 0,
    ownerId: 'u-standard', ownerName: 'Standard User', folderId: null,
    sharedWith: [], encrypted: false, scanStatus: 'clean',
    createdAt: '2026-05-03T14:30:00.000Z', updatedAt: '2026-06-10T08:15:00.000Z',
  },
  {
    id: 'f-3', name: 'budget.xlsx', type: 'file', size: 51_200,
    mimeType: 'application/vnd.ms-excel', ownerId: 'u-standard', ownerName: 'Standard User',
    folderId: null, sharedWith: ['teammate@demo.com'], encrypted: true,
    scanStatus: 'clean', createdAt: '2026-06-08T11:00:00.000Z', updatedAt: '2026-06-08T11:00:00.000Z',
  },
  {
    id: 'f-4', name: 'demo-video.mp4', type: 'file', size: 12_700_000,
    mimeType: 'video/mp4', ownerId: 'u-standard', ownerName: 'Standard User',
    folderId: null, sharedWith: [], encrypted: true, scanStatus: 'pending',
    createdAt: '2026-06-14T17:45:00.000Z', updatedAt: '2026-06-14T17:45:00.000Z',
  },
];

let SESSION_USER: User = USERS[1]; // default demo session = standard user

function makeToken(user: User): string {
  return `mock-token.${user.id}.${Date.now()}`;
}

export const mockApi = {
  async login(email: string, _password: string): Promise<AuthResponse> {
    await delay();
    const user = USERS.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? USERS[1];
    SESSION_USER = user;
    return { user, token: makeToken(user) };
  },

  async register(name: string, email: string, _password: string): Promise<AuthResponse> {
    await delay();
    const user: User = {
      id: `u-${Date.now()}`, name, email, role: 'USER', createdAt: now(),
    };
    USERS.push(user);
    SESSION_USER = user;
    return { user, token: makeToken(user) };
  },

  async me(): Promise<User> {
    await delay(150);
    return SESSION_USER;
  },

  async listUsers(): Promise<User[]> {
    await delay();
    return [...USERS];
  },

  async listFiles(folderId: string | null = null): Promise<FileItem[]> {
    await delay();
    return FILES.filter((f) => f.folderId === folderId);
  },

  async uploadFile(file: File, folderId: string | null = null): Promise<FileItem> {
    await delay(700);
    const item: FileItem = {
      id: `f-${Date.now()}`, name: file.name, type: 'file', size: file.size,
      mimeType: file.type || 'application/octet-stream', ownerId: SESSION_USER.id,
      ownerName: SESSION_USER.name, folderId, sharedWith: [], encrypted: true,
      scanStatus: 'pending', createdAt: now(), updatedAt: now(),
    };
    FILES = [item, ...FILES];
    // Simulate the async background scan finishing a moment later.
    setTimeout(() => {
      const target = FILES.find((f) => f.id === item.id);
      if (target) target.scanStatus = 'clean';
    }, 2500);
    return item;
  },

  async createFolder(name: string, folderId: string | null = null): Promise<FileItem> {
    await delay();
    const item: FileItem = {
      id: `f-${Date.now()}`, name, type: 'folder', size: 0, ownerId: SESSION_USER.id,
      ownerName: SESSION_USER.name, folderId, sharedWith: [], encrypted: false,
      scanStatus: 'clean', createdAt: now(), updatedAt: now(),
    };
    FILES = [item, ...FILES];
    return item;
  },

  async shareFile(fileId: string, email: string): Promise<FileItem> {
    await delay();
    const file = FILES.find((f) => f.id === fileId);
    if (!file) throw new Error('File not found');
    if (!file.sharedWith.includes(email)) file.sharedWith.push(email);
    file.updatedAt = now();
    return file;
  },

  async deleteFile(fileId: string): Promise<void> {
    await delay();
    FILES = FILES.filter((f) => f.id !== fileId);
  },
};
