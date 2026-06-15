import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/Spinner';
import type { Role } from '@/types';

interface Props {
  /** If set, the user must have this role to view the nested routes. */
  role?: Role;
}

/**
 * Gate for authenticated routes. Renders nested routes via <Outlet/> when the
 * user is allowed; otherwise redirects. Supports optional role-based access.
 */
export default function ProtectedRoute({ role }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return <Outlet />;
}
