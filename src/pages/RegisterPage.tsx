import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/utils';
import Spinner from '@/components/Spinner';

export default function RegisterPage() {
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The backend validates this too; checking here saves a round trip.
    if (form.password !== form.password_confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        password_confirm: form.password_confirm,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
      });
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create account'));
      setBusy(false);
    }
  }

  if (!loading && user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-4xl">🛡️</div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500">Start sharing files securely</p>
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
              placeholder="jdoe"
              value={form.username}
              onChange={update('username')}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label" htmlFor="first_name">
                First name
              </label>
              <input
                id="first_name"
                className="input"
                placeholder="Jane"
                value={form.first_name}
                onChange={update('first_name')}
              />
            </div>
            <div className="flex-1">
              <label className="label" htmlFor="last_name">
                Last name
              </label>
              <input
                id="last_name"
                className="input"
                placeholder="Doe"
                value={form.last_name}
                onChange={update('last_name')}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              placeholder="you@example.com"
              value={form.email}
              onChange={update('email')}
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
              minLength={8}
              autoComplete="new-password"
              className="input"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={update('password')}
            />
          </div>
          <div>
            <label className="label" htmlFor="password_confirm">
              Confirm password
            </label>
            <input
              id="password_confirm"
              type="password"
              required
              autoComplete="new-password"
              className="input"
              placeholder="Re-enter your password"
              value={form.password_confirm}
              onChange={update('password_confirm')}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Spinner className="h-4 w-4" /> : 'Create account'}
          </button>

          <p className="text-center text-xs text-slate-500">
            New accounts start with the <strong>Write Only</strong> role — you can upload,
            download and share your own files. An admin can change your role later.
          </p>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
