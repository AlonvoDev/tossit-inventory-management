import React from 'react';
import { Card as MuiCard, CardContent, CardHeader, CardProps as MuiCardProps } from '@mui/material';
import { tokens } from '../../app/theme';

export interface CardProps extends MuiCardProps {
  title?: string;
  subtitle?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export const Card: React.FC<CardProps> = ({ 
  title, 
  subtitle, 
  children, 
  padding = 'medium',
  ...props 
}) => {
  const paddingValues = {
    none: '0',
    small: tokens.spacing.md,
    medium: tokens.spacing.lg,
    large: tokens.spacing.lg,
  };

  return (
    <MuiCard
      variant="outlined"
      {...props}
      sx={{
        // V3: flat surface with a thin border; compact section heading (no large card title).
        backgroundColor: tokens.colors.surface,
        boxShadow: 'none',
        border: 1,
        borderColor: 'divider',
        borderRadius: tokens.radius,
        ...props.sx,
      }}
    >
      {(title || subtitle) && (
        <CardHeader
          title={title}
          subheader={subtitle}
          titleTypographyProps={{ component: 'h2', sx: { fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.3 } }}
          subheaderTypographyProps={{ sx: { fontSize: '0.875rem' } }}
          sx={{
            px: 2,
            pt: 1.75,
            pb: 0,
            color: tokens.colors.text.primary,
            '& .MuiCardHeader-subheader': {
              color: tokens.colors.text.muted,
            },
          }}
        />
      )}
      <CardContent sx={{ padding: paddingValues[padding], '&:last-child': { pb: paddingValues[padding] } }}>
        {children}
      </CardContent>
    </MuiCard>
  );
};
