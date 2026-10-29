import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RefreshCw, ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center text-slate-300 p-4 text-center">
        <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin mb-4" />
        <p className="text-sm tracking-wide">Validating authentication credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If user's role is not permitted for this route, redirect to their own dashboard
    const redirectPath = role === 'ADMIN' ? '/admin/dashboard' : '/lecturer/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
