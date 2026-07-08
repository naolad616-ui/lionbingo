import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminProtectedRoute({ permission = null }) {
  const { isAuthenticated, loading, hasPermission } = useAdminAuth();

  if (loading) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center">
        <p className="text-slate-300">Checking session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
