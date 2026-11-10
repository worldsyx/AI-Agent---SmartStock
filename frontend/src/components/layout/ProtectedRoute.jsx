import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthContext';
import { Spinner } from '@/components/ui';

/**
 * ProtectedRoute — ensures user is authenticated and enforces RBAC permission.
 * Does NOT render layout to prevent duplicate nested layouts.
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Spinner size={36} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roleName = user.role?.name || 'operator';
  const isOperator = roleName === 'operator';

  // Check role permissions if specified
  if (allowedRoles && !allowedRoles.includes(roleName)) {
    if (isOperator) {
      return <Navigate to="/operator/home" replace />;
    } else {
      return <Navigate to="/manager/dashboard" replace />;
    }
  }

  return <Outlet />;
}
