import React from 'react';
import { Box, Typography } from '@mui/material';
import { Card } from '../../components/ui';
import DiscardReport from '../../components/DiscardReport';
import { PageHeader } from '../../components/layout/PageHeader';
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
    <Box sx={{ maxWidth: '1200px', margin: '0 auto', py: { xs: 1, sm: 2 } }}>
      <PageHeader title="דוחות" />
      <DiscardReport businessId={userProfile.businessId} />
    </Box>
  );
};
