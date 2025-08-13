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
          marginTop: user ? { xs: '56px', sm: '64px', md: '70px' } : 0, // Responsive navigation height
          padding: { xs: tokens.spacing.md, sm: tokens.spacing.lg },
        }}
      >
        <AppRoutes />
      </Box>
    </Box>
  );
};

export default App;
