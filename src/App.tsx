import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ShiftProvider } from './context/ShiftContext';
import { NotificationProvider } from './context/NotificationContext';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import materialTheme from './theme/materialTheme';
import { requestNotificationPermission, registerServiceWorker } from './utils/notificationUtils';
import { initResponsiveUtils } from './utils/responsiveUtils';
// import { useAuthState } from 'react-firebase-hooks/auth';
// import { auth } from './services/firebase';
import NotAuthorized from './pages/NotAuthorized';
import LoadingSkeleton from './components/LoadingSkeleton';
// import EnhancedLoading from './components/EnhancedLoading';

// Pages
import { Dashboard, LoginPage, AdminPanel, AdminUsersPage, NotFound, RegisterPage, AdminFridgesPage } from './pages';

// Styles
import './App.css';

// Protected Route component with admin enforcement
const ProtectedRoute: React.FC<{ 
  element: React.ReactNode; 
  requiredRole?: 'admin' | 'manager' | 'user';
  routeType?: 'dashboard' | 'admin' | 'full-page';
}> = ({ element, requiredRole, routeType = 'full-page' }) => {
  const { user, profile, isAdmin, isManager, loading } = useAuth();
  
  // Check if user meets required role
  const hasRequiredRole = () => {
    if (requiredRole === 'admin') return isAdmin;
    if (requiredRole === 'manager') return isAdmin || isManager; // Admin can access manager routes
    return true; // No specific role required
  };
  
  // Show loading skeleton while authentication and profile are being determined
  if (loading) {
    let loadingMessage = 'Loading user profile...';
    
    if (requiredRole === 'admin') {
      loadingMessage = 'Verifying admin permissions...';
    } else if (requiredRole === 'manager') {
      loadingMessage = 'Verifying manager permissions...';
    } else if (user && !profile) {
      loadingMessage = 'Loading your role and department...';
    }
    
    return (
      <LoadingSkeleton 
        type={routeType} 
        message={loadingMessage}
      />
    );
  }
  
  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user's Firestore profile doesn't exist - redirect to not-authorized
  if (!profile) {
    return <Navigate to="/not-authorized" replace />;
  }
  
  // Block access to routes based on required role
  if (requiredRole && !hasRequiredRole()) {
    return <Navigate to="/not-authorized" replace />;
  }
  
  return <>{element}</>;
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  // const [userFromHook] = useAuthState(auth);
  
  useEffect(() => {
    // Initialize responsive utilities
    const cleanupResponsive = initResponsiveUtils();
    
    // Request notification permission when user is logged in
    if (user) {
      requestNotificationPermission();
      registerServiceWorker();
    }
    // Set RTL direction globally
    document.body.dir = 'rtl';
    
    // RTL is now handled by Material-UI theme provider
    
    // Cleanup on unmount
    return () => {
      cleanupResponsive();
    };
  }, [user]);
  
  return (
    <Router>
      <Routes>
        {/* Public routes - no protection needed */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
        <Route path="/not-authorized" element={<NotAuthorized />} />
        
        {/* Protected routes - require authentication */}
        <Route path="/dashboard" element={
          <ProtectedRoute 
            element={<Dashboard />} 
            routeType="dashboard"
          />
        } />
        
        {/* Admin routes - require authentication and admin/manager role */}
        <Route path="/admin" element={
          <ProtectedRoute 
            element={<AdminPanel />} 
            requiredRole="manager"
            routeType="admin"
          />
        } />
        
        <Route path="/admin/users" element={
          <ProtectedRoute 
            element={<AdminUsersPage />} 
            requiredRole="admin"
            routeType="admin"
          />
        } />

    {/* Admin route for managing fridges/locations */}
    <Route path="/admin/fridges" element={
      <ProtectedRoute
        element={<AdminFridgesPage />}
        requiredRole="admin"
        routeType="admin"
      />
    } />
        
        {/* Default redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={materialTheme}>
      <CssBaseline />
      <AuthProvider>
        <NotificationProvider>
          <ShiftProvider>
            <AppContent />
          </ShiftProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
