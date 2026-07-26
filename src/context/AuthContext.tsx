import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { clearTokens, getAccessToken, onSessionExpired } from '@/api/client';
import { clearUserIdCache } from '@/api/permissions';
import * as authApi from '@/api/auth';
import type { ApiUser, RoleName } from '@/types';

interface AuthContextValue {
  user: ApiUser | null;
  /** True until the initial session-restore attempt finishes. */
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: authApi.RegisterPayload) => Promise<void>;
  logout: () => void;

  // Role checks, mirroring the properties on the backend's User model so the
  // UI hides exactly what the API would refuse.
  role: RoleName | null;
  /** System administrator: manages users and sees all files and logs. */
  isSystemAdmin: boolean;
  /**
   * May upload files. Mirrors `User.can_upload`, which admits `group_leader`
   * and `write_only` only — a system `admin` is deliberately not included
   * there, so the upload controls stay hidden for admins too.
   */
  canUpload: boolean;
  /** May assign roles — `admin` and `group_leader`. */
  canAssignRoles: boolean;
  /** Name to show in the UI: full name when set, otherwise the username. */
  displayName: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on first load. A stored access token may well be
  // expired (they live five minutes), in which case the client's interceptor
  // refreshes it transparently during this call.
  useEffect(() => {
    async function restore() {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        setUser(await authApi.getMe());
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    }
    restore();
  }, []);

  // The API client reports here when a refresh fails and the session is over;
  // dropping the user sends ProtectedRoute to /login without a page reload.
  useEffect(
    () =>
      onSessionExpired(() => {
        clearUserIdCache();
        setUser(null);
      }),
    [],
  );

  async function login(username: string, password: string) {
    setUser(await authApi.login(username, password));
  }

  async function register(payload: authApi.RegisterPayload) {
    setUser(await authApi.register(payload));
  }

  function logout() {
    clearTokens();
    clearUserIdCache();
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(() => {
    const role = user?.role?.name ?? null;
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();

    return {
      user,
      loading,
      login,
      register,
      logout,
      role,
      isSystemAdmin: role === 'admin',
      canUpload: role === 'group_leader' || role === 'write_only',
      canAssignRoles: role === 'admin' || role === 'group_leader',
      displayName: fullName || user?.username || '',
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
