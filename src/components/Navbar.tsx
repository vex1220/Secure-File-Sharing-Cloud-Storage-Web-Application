import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import RoleBadge from '@/components/RoleBadge';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/files', label: 'My Files', end: false },
  { to: '/activity', label: 'Activity', end: false },
];

const linkClass = (isActive: boolean, accent = 'blue') =>
  cn(
    'rounded-lg px-3 py-2 text-sm font-medium',
    isActive
      ? accent === 'purple'
        ? 'bg-purple-50 text-purple-700'
        : 'bg-blue-50 text-blue-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  );

export default function Navbar() {
  const { user, logout, isSystemAdmin, displayName } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <NavLink to="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="text-xl">🛡️</span>
          <span>SecureShare</span>
        </NavLink>

        <div className="flex items-center gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => linkClass(isActive)}
            >
              {link.label}
            </NavLink>
          ))}
          {/* Admin-only link — the route is gated as well. */}
          {isSystemAdmin && (
            <NavLink to="/admin" className={({ isActive }) => linkClass(isActive, 'purple')}>
              Admin
            </NavLink>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {user && (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm text-slate-600">{displayName}</span>
              <RoleBadge role={user.role} />
            </div>
          )}
          <button onClick={handleLogout} className="btn-secondary">
            Log out
          </button>
        </div>
      </nav>
    </header>
  );
}
