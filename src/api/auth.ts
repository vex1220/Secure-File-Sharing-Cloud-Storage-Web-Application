import { apiClient, USE_MOCK } from '@/api/client';
import { mockApi } from '@/api/mock';
import type { AuthResponse, User } from '@/types';

/**
 * Auth API calls. Each function branches on USE_MOCK so the UI works with or
 * without the real backend. Replace the mock branch behavior by setting
 * VITE_USE_MOCK=false — the axios calls below target Member 2's endpoints.
 */

export async function login(email: string, password: string): Promise<AuthResponse> {
  if (USE_MOCK) return mockApi.login(email, password);
  const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  if (USE_MOCK) return mockApi.register(name, email, password);
  const { data } = await apiClient.post<AuthResponse>('/auth/register', { name, email, password });
  return data;
}

/** Fetch the currently authenticated user (used to restore a session). */
export async function getMe(): Promise<User> {
  if (USE_MOCK) return mockApi.me();
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}

/** Admin-only: list all users. */
export async function listUsers(): Promise<User[]> {
  if (USE_MOCK) return mockApi.listUsers();
  const { data } = await apiClient.get<User[]>('/users');
  return data;
}
