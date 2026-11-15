import React from 'react';
import { Box, Typography } from '@mui/material';
import { Card } from '../../components/ui';
import { tokens } from '../../app/theme';
import DiscardReport from '../../components/DiscardReport';
import { useAuth } from '../../context/AuthContext';

/**
 * Reports for this release: the discard report only. Inventory and expiry report types
 * were placeholders and are intentionally not offered (delivery plan U3).
 */
export const ReportsPage: React.FC = () => {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return (
      <Card title="שגיאה">
        <Typography>לא ניתן לטעון את פרופיל המשתמש</Typography>
      </Card>
    );
  }

  return (
    <Box sx={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Typography
        variant="h1"
        sx={{
          marginBottom: tokens.spacing.lg,
          color: tokens.colors.text.primary,
          fontSize: { xs: '1.75rem', sm: '2.25rem' },
        }}
      >
        דוחות
      </Typography>
      <DiscardReport businessId={userProfile.businessId} />
    </Box>
  );
};
