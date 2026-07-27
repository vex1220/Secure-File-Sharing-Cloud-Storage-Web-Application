import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { buildSecurityHeaders } from '@/lib/security';

/**
 * Axios instance pointed at the Django REST backend.
 *
 * In development `VITE_API_BASE_URL` stays as `/api`, which Vite proxies to
 * http://localhost:8000 (see vite.config.ts) — that keeps the browser on a
 * single origin so CORS never enters the picture. In production set it to the
 * deployed API root, e.g. https://your-app.railway.app/api
 *
 * Every backend route ends in a trailing slash. Django's URL resolver will not
 * match without it, and APPEND_SLASH cannot rescue a POST/PATCH/DELETE, so the
 * paths in this folder always include it.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const apiClient = axios.create({ baseURL });

// No default Content-Type here on purpose: axios sets `application/json` for
// plain objects by itself, and leaving it unset lets the browser generate the
// `multipart/form-data` boundary for file uploads. Hard-coding the multipart
// header would omit that boundary and Django would reject the upload.

// --- JWT storage -----------------------------------------------------------
// simplejwt is running on its defaults, so the access token is only valid for
// five minutes while the refresh token lasts a day. Both are persisted so a
// reload keeps the session, and the response interceptor below silently trades
// an expired access token for a fresh one.
const ACCESS_KEY = 'sfs_access';
const REFRESH_KEY = 'sfs_refresh';

export const getAccessToken = (): string | null => localStorage.getItem(ACCESS_KEY);
export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_KEY);

export function storeTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// --- Session-expiry notification -------------------------------------------
// When refreshing fails there is no way back and the user has to sign in again.
// Rather than forcing a full page reload from here, the client notifies whoever
// is listening (AuthContext) and lets React route to /login normally.
type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;

export function onSessionExpired(handler: SessionExpiredHandler): () => void {
  sessionExpiredHandler = handler;
  return () => {
    sessionExpiredHandler = null;
  };
}

function endSession(): void {
  clearTokens();
  sessionExpiredHandler?.();
}

// --- Interceptors ----------------------------------------------------------

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const securityHeaders = buildSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    config.headers[key] = value;
  });

  return config;
});

/** Endpoints that issue tokens — a 401 from these is a real failure, not an expiry. */
const AUTH_PATHS = ['/accounts/login/', '/accounts/token/refresh/', '/accounts/register/'];

const isAuthPath = (url = '') => AUTH_PATHS.some((path) => url.includes(path));

/**
 * Exchange the refresh token for a new access token.
 *
 * This uses a bare `axios.post` rather than `apiClient` so the call cannot
 * re-enter the response interceptor and start an infinite refresh loop.
 */
async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error('No refresh token stored');

  const { data } = await axios.post<{ access: string }>(
    `${baseURL}/accounts/token/refresh/`,
    { refresh },
  );
  localStorage.setItem(ACCESS_KEY, data.access);
  return data.access;
}

// A single in-flight refresh shared by every request that 401s at once — on a
// page that loads files, folders and logs together, all three would otherwise
// fire their own refresh and invalidate each other.
let refreshInFlight: Promise<string> | null = null;

function refreshOnce(): Promise<string> {
  refreshInFlight ??= refreshAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** Tracks the one retry each request is allowed after a token refresh. */
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;

    const shouldRefresh =
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !isAuthPath(original.url);

    if (!shouldRefresh) return Promise.reject(error);

    original._retried = true;
    try {
      const access = await refreshOnce();
      original.headers.Authorization = `Bearer ${access}`;
      return await apiClient(original);
    } catch {
      // The refresh token is expired or rejected — the session is over.
      endSession();
      return Promise.reject(error);
    }
  },
);

/** Ping `GET /api/health/`. Used by the login screen to report backend status. */
export async function checkHealth(): Promise<boolean> {
  try {
    const { data } = await axios.get<{ status: string }>(`${baseURL}/health/`);
    return data.status === 'ok';
  } catch {
    return false;
  }
}
