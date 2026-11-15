import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import Dashboard from '../pages/Dashboard';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import AdminPanel from '../pages/AdminPanel';
import AdminUsersPage from '../pages/AdminUsersPage';
import AdminFridgesPage from '../pages/AdminFridgesPage';
import NotFound from '../pages/NotFound';
import NotAuthorized from '../pages/NotAuthorized';
import { ReportsPage } from '../features/reports/ReportsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { useAuth } from '../context/AuthContext';
import { AppRouteId, canAccessRoute } from './access';

export const AuthLoadingScreen: React.FC = () => (
  <Box
    role="status"
    aria-live="polite"
    sx={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    }}
  >
    <CircularProgress />
    <Typography color="text.secondary">טוען את פרטי המשתמש...</Typography>
  </Box>
);

/**
 * Gate for every signed-in screen. Order matters:
 * signed out -> login; signed in without an active profile -> access screen;
 * profile without the role for this screen -> not authorized.
 */
const RequireAccess: React.FC<{ route: AppRouteId; children: React.ReactElement }> = ({
  route,
  children,
}) => {
  const { user, isAuthenticated, profileNotFound, role } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!isAuthenticated) {
    return <NotAuthorized reason={profileNotFound ? 'no-profile' : 'profile-error'} />;
  }
  if (!canAccessRoute(role, route)) {
    return <NotAuthorized reason="role" />;
  }
  return children;
};

const safeReturnPath = (state: unknown): string => {
  const from = (state as { from?: unknown } | null)?.from;
  // Only same-app absolute paths; never protocol-relative or external URLs.
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && from !== '/login'
    ? from
    : '/dashboard';
};

const PublicOnly: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  // A signed-in account without access is sent to a protected path, which shows the access screen.
  return user ? <Navigate to={safeReturnPath(location.state)} replace /> : children;
};

export const AppRoutes = () => {
  const { loading } = useAuth();

  // Render nothing role-specific until identity and profile are resolved.
  if (loading) {
    return <AuthLoadingScreen />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<RequireAccess route="dashboard"><Dashboard /></RequireAccess>} />
      <Route path="/reports" element={<RequireAccess route="reports"><ReportsPage /></RequireAccess>} />
      <Route path="/settings" element={<RequireAccess route="settings"><SettingsPage /></RequireAccess>} />
      <Route path="/admin" element={<RequireAccess route="admin"><AdminPanel /></RequireAccess>} />
      <Route path="/admin/users" element={<RequireAccess route="adminUsers"><AdminUsersPage /></RequireAccess>} />
      <Route path="/admin/fridges" element={<RequireAccess route="adminFridges"><AdminFridgesPage /></RequireAccess>} />
      <Route path="/not-authorized" element={<NotAuthorized reason="role" />} />

      {/* Default routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
