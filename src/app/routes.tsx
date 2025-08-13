import { Routes, Route, Navigate } from 'react-router-dom';
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
import { useAuth } from '../hooks/useAuth';

export const AppRoutes = () => {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return <div>טוען...</div>;
  }

  const isAuthenticated = !!user;
  const isAdmin = userProfile?.role === 'admin';

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/register" 
        element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" replace />} 
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
      />
      
      <Route
        path="/reports"
        element={isAuthenticated ? <ReportsPage /> : <Navigate to="/login" replace />}
      />
      
      <Route
        path="/settings"
        element={isAuthenticated ? <SettingsPage /> : <Navigate to="/login" replace />}
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={isAuthenticated && isAdmin ? <AdminPanel /> : <NotAuthorized />}
      />
      <Route
        path="/admin/users"
        element={isAuthenticated && isAdmin ? <AdminUsersPage /> : <NotAuthorized />}
      />
      <Route
        path="/admin/fridges"
        element={isAuthenticated && isAdmin ? <AdminFridgesPage /> : <NotAuthorized />}
      />

      {/* Default routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
