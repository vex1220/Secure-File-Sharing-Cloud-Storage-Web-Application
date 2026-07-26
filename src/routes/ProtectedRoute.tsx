import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/Spinner';
import type { RoleName } from '@/types';

interface Props {
  /** When set, the user's role must be one of these to view the nested routes. */
  roles?: RoleName[];
}

/**
 * Gate for authenticated routes. Renders nested routes via <Outlet/> when the
 * user is allowed; otherwise redirects. Client-side role checks are a UX
 * nicety, not the security boundary — every endpoint re-checks server-side.
 */
export default function ProtectedRoute({ roles }: Props) {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && (!role || !roles.includes(role))) return <Navigate to="/" replace />;

  return <Outlet />;
}
