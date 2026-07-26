import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { checkHealth } from '@/api/client';
import { getErrorMessage } from '@/lib/utils';
import Spinner from '@/components/Spinner';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [backendUp, setBackendUp] = useState<boolean | null>(null);

  // Surface a dead backend up front — otherwise the first failed login looks
  // like bad credentials when it is really a connection problem.
  useEffect(() => {
    checkHealth().then(setBackendUp);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid username or password'));
      setBusy(false);
    }
  }

  if (!loading && user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-4xl">🛡️</div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500">Sign in to SecureShare</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              required
              autoComplete="username"
              className="input"
              placeholder="your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Spinner className="h-4 w-4" /> : 'Sign in'}
          </button>

          <p className="text-center text-sm text-slate-500">
            No account?{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-700">
              Create one
            </Link>
          </p>
        </form>

        {backendUp === false && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-center text-xs text-red-800">
            <strong>Backend unreachable.</strong> Start the API with{' '}
            <code className="font-mono">python manage.py runserver</code> on port 8000.
          </div>
        )}
      </div>
    </div>
  );
}
