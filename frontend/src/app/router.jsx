import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import ManagerLayout from '@/components/layout/ManagerLayout';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { useAuth } from '@/app/providers/AuthContext';

// Auth
import LoginPage from '@/features/auth/LoginPage';

// Manager Features (PRD 3.1 & 4 & 5)
import ManagerDashboardPage from '@/features/manager/dashboard/ManagerDashboardPage';
import ManagerReportsPage from '@/features/manager/reports/ManagerReportsPage';
import ManagerAiRecommendationsPage from '@/features/manager/ai-recommendations/ManagerAiRecommendationsPage';
import AiPerformancePage from '@/features/manager/ai-performance/AiPerformancePage';
import ManagerAiChatPage from '@/features/manager/ai-chat/ManagerAiChatPage';
import ManagerInventoryPage from '@/features/manager/inventory/ManagerInventoryPage';
import ManagerLocationsPage from '@/features/manager/locations/ManagerLocationsPage';
import ManagerTransactionsPage from '@/features/manager/transactions/ManagerTransactionsPage';
import ManagerStocktakePage from '@/features/manager/stocktake/ManagerStocktakePage';

// Operator Features (PRD 3.2 & 6)
import OperatorHomePage from '@/features/operator/home/OperatorHomePage';
import OperatorScanPage from '@/features/operator/qr-scanner/OperatorScanPage';
import OperatorReceiptPage from '@/features/operator/receipts/OperatorReceiptPage';
import OperatorIssuePage from '@/features/operator/issues/OperatorIssuePage';
import OperatorStockLocationsPage from '@/features/operator/stock-locations/OperatorStockLocationsPage';
import OperatorHistoryPage from '@/features/operator/history/OperatorHistoryPage';

// Unified Single Settings Page (PRD Rule 5 & 3.3)
import SettingsPage from '@/features/settings/SettingsPage';

// Technical Admin (PRD 2.3)
import UsersPage from '@/features/users/UsersPage';

function RoleHomeRedirect() {
  const { user } = useAuth();
  const roleName = user?.role?.name || 'operator';
  if (roleName === 'manager') return <Navigate to="/manager/dashboard" replace />;
  if (roleName === 'operator') return <Navigate to="/operator/home" replace />;
  if (roleName === 'admin') return <Navigate to="/manager/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

// Exactly one Manager layout wrapper
function ManagerWrapper() {
  return (
    <ManagerLayout>
      <Outlet />
    </ManagerLayout>
  );
}

// Exactly one Operator layout wrapper
function OperatorWrapper() {
  return (
    <OperatorLayout>
      <Outlet />
    </OperatorLayout>
  );
}

// Role-aware settings layout (PRD Rule 5: single /settings route)
function SettingsWrapper() {
  const { user } = useAuth();
  const isOperator = user?.role?.name === 'operator';
  if (isOperator) {
    return (
      <OperatorLayout>
        <SettingsPage />
      </OperatorLayout>
    );
  }
  return (
    <ManagerLayout>
      <SettingsPage />
    </ManagerLayout>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />, // Pure authentication guard (checks login, no layout duplication)
    children: [
      { path: '/', element: <RoleHomeRedirect /> },
      { path: '/dashboard', element: <RoleHomeRedirect /> },

      // ── Manager Features (Guarded for Manager & Admin + ManagerLayout applied ONCE) ──
      {
        element: <ProtectedRoute allowedRoles={['manager', 'admin']} />,
        children: [
          {
            element: <ManagerWrapper />,
            children: [
              { path: '/manager/dashboard', element: <ManagerDashboardPage /> },
              { path: '/manager/reports', element: <ManagerReportsPage /> },
              { path: '/manager/ai-recommendations', element: <ManagerAiRecommendationsPage /> },
              { path: '/manager/ai-performance', element: <AiPerformancePage /> },
              { path: '/manager/ai-chat', element: <ManagerAiChatPage /> },
              { path: '/manager/inventory', element: <ManagerInventoryPage /> },
              { path: '/manager/locations', element: <ManagerLocationsPage /> },
              { path: '/manager/transactions', element: <ManagerTransactionsPage /> },
              { path: '/manager/stocktake', element: <ManagerStocktakePage /> },
            ],
          },
        ],
      },

      // ── Operator Features (Guarded for Operator & Admin + OperatorLayout applied ONCE) ──
      {
        element: <ProtectedRoute allowedRoles={['operator', 'admin']} />,
        children: [
          {
            element: <OperatorWrapper />,
            children: [
              { path: '/operator/home', element: <OperatorHomePage /> },
              { path: '/operator/scan', element: <OperatorScanPage /> },
              { path: '/operator/receipts', element: <OperatorReceiptPage /> },
              { path: '/operator/issues', element: <OperatorIssuePage /> },
              { path: '/operator/stock-locations', element: <OperatorStockLocationsPage /> },
              { path: '/operator/history', element: <OperatorHistoryPage /> },
            ],
          },
        ],
      },

      // ── PRD Rule 5: Unified Single Settings Page ──
      { path: '/settings', element: <SettingsWrapper /> },

      // ── PRD 2.3: Admin Technical Management (Hidden from Daily Nav) ──
      {
        element: <ProtectedRoute allowedRoles={['admin']} />,
        children: [
          {
            element: <ManagerWrapper />,
            children: [
              { path: '/admin/users', element: <UsersPage /> },
            ],
          },
        ],
      },

      // Catch-all
      { path: '*', element: <RoleHomeRedirect /> },
    ],
  },
]);
