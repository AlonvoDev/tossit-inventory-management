import React from 'react';
import { Box } from '@mui/material';
import { AppRoutes } from './routes';
import UnifiedNavigation from '../components/UnifiedNavigation';
import { useAuth } from '../hooks/useAuth';
import { tokens } from './theme';

const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: tokens.colors.bg,
        direction: 'rtl',
      }}
    >
      {user && <UnifiedNavigation />}
      
      <Box
        component="main"
        sx={{
          marginTop: user ? '80px' : 0, // Account for navigation height
          padding: tokens.spacing.lg,
        }}
      >
        <AppRoutes />
      </Box>
    </Box>
  );
};

export default App;
