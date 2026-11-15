import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Shared page heading for management screens (UI3): one h1, an optional one-line description and
 * actions aligned to the opposite side. Wraps on narrow screens without horizontal overflow.
 */
export const PageHeader: React.FC<{ title: string; description?: React.ReactNode; actions?: React.ReactNode }> = ({
  title,
  description,
  actions,
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: { xs: 'stretch', sm: 'center' },
      justifyContent: 'space-between',
      flexDirection: { xs: 'column', sm: 'row' },
      gap: 1.5,
      mb: 2,
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography component="h1" sx={{ fontSize: { xs: '1.3rem', sm: '1.5rem' }, fontWeight: 700, lineHeight: 1.3 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      )}
    </Box>
    {actions && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>{actions}</Box>}
  </Box>
);
