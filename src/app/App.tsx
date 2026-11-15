import React from 'react';
import { Box } from '@mui/material';
import { AppRoutes } from './routes';
import UnifiedNavigation from '../components/UnifiedNavigation';
import { useAuth } from '../context/AuthContext';
import { tokens } from './theme';

const App: React.FC = () => {
  // Navigation only for a resolved, active profile; never during loading or for accounts without access.
  const { isAuthenticated, loading } = useAuth();
  const showNavigation = isAuthenticated && !loading;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: tokens.colors.bg,
        direction: 'rtl',
      }}
    >
      {showNavigation && <UnifiedNavigation />}
      
      <Box
        component="main"
        sx={{
          marginTop: showNavigation ? { xs: '56px', sm: '64px', md: '70px' } : 0, // Responsive navigation height
          padding: { xs: tokens.spacing.md, sm: tokens.spacing.lg },
        }}
      >
        <AppRoutes />
      </Box>
    </Box>
  );
};

export default App;
