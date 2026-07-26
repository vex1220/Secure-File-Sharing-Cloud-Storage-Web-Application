import { apiClient, clearTokens, storeTokens } from '@/api/client';
import type { ApiUser, RoleName, TokenPair } from '@/types';

/** Fields the backend's RegisterSerializer accepts. */
export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Log in and return the authenticated user.
 *
 * The backend's login endpoint is simplejwt's token view, so it answers with
 * the JWT pair only — never a user object. The tokens are stored first and the
 * profile is then fetched from `/accounts/me/` using the new access token.
 */
export async function login(username: string, password: string): Promise<ApiUser> {
  const { data } = await apiClient.post<TokenPair>('/accounts/login/', { username, password });
  storeTokens(data.access, data.refresh);

  try {
    return await getMe();
  } catch (err) {
    // Tokens without a readable profile is a broken session — don't keep it.
    clearTokens();
    throw err;
  }
}

/**
 * Create an account, then sign in with the same credentials.
 *
 * Registration responds `201 {message, user}` and issues no tokens, so the
 * follow-up login is what actually starts the session.
 */
export async function register(payload: RegisterPayload): Promise<ApiUser> {
  await apiClient.post<{ message: string; user: ApiUser }>('/accounts/register/', payload);
  return login(payload.username, payload.password);
}

/** The currently authenticated user, used to restore a session on reload. */
export async function getMe(): Promise<ApiUser> {
  const { data } = await apiClient.get<ApiUser>('/accounts/me/');
  return data;
}

/** List every user. Returns 403 for anyone who is not a system admin. */
export async function listUsers(): Promise<ApiUser[]> {
  const { data } = await apiClient.get<ApiUser[]>('/accounts/users/');
  return data;
}

/**
 * Assign a role. Permitted for `admin` and `group_leader`; only an `admin` may
 * grant the `admin` role itself.
 */
export async function updateUserRole(userId: number, role: RoleName): Promise<ApiUser> {
  const { data } = await apiClient.patch<ApiUser>(`/accounts/users/${userId}/role/`, { role });
  return data;
}
