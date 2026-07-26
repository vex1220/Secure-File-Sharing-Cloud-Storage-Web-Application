import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/routes/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import FilesPage from '@/pages/FilesPage';
import ActivityPage from '@/pages/ActivityPage';
import AdminPage from '@/pages/AdminPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Authenticated routes (any logged-in user) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/activity" element={<ActivityPage />} />

          {/* Admin-only route (RBAC): the user list and full audit log. */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      {/* Fallbacks */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
