import type { StoredFile } from '@/types';

const AUDIT_STORAGE_KEY = 'sfs_security_audit';
const SESSION_KEY_STORAGE_KEY = 'sfs_session_encryption_key';
const MAX_AUDIT_EVENTS = 12;

export type SecuritySeverity = 'info' | 'warning' | 'error';
export type SecurityCategory = 'upload' | 'download' | 'share' | 'validation' | 'background';

export interface SecurityAuditEvent {
  id: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  message: string;
  createdAt: string;
  detail?: string;
}

export interface SecureUploadPayload {
  file: File;
  metadata: {
    algorithm: string;
    originalName: string;
    keyId: string;
  };
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

function readAuditEntries(): SecurityAuditEvent[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];

  try {
    const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SecurityAuditEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistAuditEntries(entries: SecurityAuditEvent[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event('sfs:audit-updated'));
}

export function getAuditEntries(): SecurityAuditEvent[] {
  return readAuditEntries();
}

export function clearAuditEntries(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(AUDIT_STORAGE_KEY);
}

export function recordAuditEvent(
  category: SecurityCategory,
  severity: SecuritySeverity,
  message: string,
  detail?: string,
): SecurityAuditEvent {
  const event: SecurityAuditEvent = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category,
    severity,
    message,
    createdAt: new Date().toISOString(),
    detail,
  };

  const next = [event, ...readAuditEntries()].slice(0, MAX_AUDIT_EVENTS);
  persistAuditEntries(next);
  return event;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

async function importSessionKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function createSessionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

async function getOrCreateSessionKey(): Promise<CryptoKey> {
  const storage = getStorage();
  const storedValue = storage?.getItem(SESSION_KEY_STORAGE_KEY);

  if (storedValue) {
    return importSessionKey(base64ToArrayBuffer(storedValue));
  }

  const key = await createSessionKey();
  const exported = await crypto.subtle.exportKey('raw', key);
  storage?.setItem(SESSION_KEY_STORAGE_KEY, arrayBufferToBase64(exported));
  return key;
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

export function sanitizeFileName(rawName: string): string {
  const trimmed = rawName.trim();
  const cleaned = trimmed
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\.+$/g, '');

  return cleaned || 'secure-file';
}

export function validateUploadFile(file: File): ValidationResult {
  const safeName = sanitizeFileName(file.name);

  if (!safeName || /[<>:"/\\|?*\x00-\x1f]/.test(file.name)) {
    return { ok: false, error: 'File name contains unsupported characters.' };
  }

  if (file.size === 0) {
    return { ok: false, error: 'The selected file is empty.' };
  }

  if (file.size > 25 * 1024 * 1024) {
    return { ok: false, error: 'File size exceeds the 25MB limit.' };
  }

  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.js', '.html', '.htm', '.ps1', '.dll', '.jar'];
  const lowered = safeName.toLowerCase();
  const blocked = dangerousExtensions.some((extension) => lowered.endsWith(extension));

  if (blocked) {
    return { ok: false, error: 'Executable file types are blocked for security reasons.' };
  }

  return { ok: true };
}

export async function buildEncryptedUpload(file: File): Promise<SecureUploadPayload> {
  const key = await getOrCreateSessionKey();
  const raw = await file.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, raw));
  const payload = new Uint8Array(iv.byteLength + encrypted.byteLength);
  payload.set(iv, 0);
  payload.set(encrypted, iv.byteLength);

  const safeName = sanitizeFileName(file.name);
  const encryptedFile = new File([payload], `${safeName}.enc`, { type: 'application/octet-stream' });

  return {
    file: encryptedFile,
    metadata: {
      algorithm: 'AES-GCM',
      originalName: file.name,
      keyId: 'session-key',
    },
  };
}

export async function decryptBlob(blob: Blob): Promise<Blob> {
  const key = await getOrCreateSessionKey();
  const raw = new Uint8Array(await blob.arrayBuffer());
  const iv = raw.slice(0, 12);
  const ciphertext = raw.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new Blob([decrypted], { type: 'application/octet-stream' });
}

export async function hashFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function scheduleBackgroundTask(label: string, task: () => Promise<void> | void): void {
  const runTask = async () => {
    try {
      await task();
      recordAuditEvent('background', 'info', `Background task completed: ${label}`);
    } catch (error) {
      recordAuditEvent('background', 'warning', `Background task failed: ${label}`, error instanceof Error ? error.message : String(error));
    }
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      void runTask();
    }, { timeout: 5000 });
    return;
  }

  window.setTimeout(() => {
    void runTask();
  }, 0);
}

export function buildSecurityHeaders(): Record<string, string> {
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    'X-Request-Id': requestId,
    'X-Security-Mode': 'encrypted-client',
  };
}

export function recordFileEvent(file: StoredFile, action: 'upload' | 'download' | 'share', message: string): SecurityAuditEvent {
  return recordAuditEvent(action, 'info', `${message} (${file.original_name})`, `Owner=${file.owner}`);
}
