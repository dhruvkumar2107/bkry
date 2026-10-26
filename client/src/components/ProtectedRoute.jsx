import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth.js';
import { PageLoader } from './ui.jsx';

export default function ProtectedRoute({ role, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <div className="grid min-h-screen place-items-center"><PageLoader /></div>;
  if (!user) {
    const loginPath = role === 'ADMIN' ? '/admin/login' : role === 'DELIVERY' ? '/delivery/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
  }
  if (role && user.role !== role) {
    const fallback = user.role === 'ADMIN' ? '/admin' : user.role === 'DELIVERY' ? '/delivery' : '/';
    return <Navigate to={fallback} replace />;
  }
  return children;
}
