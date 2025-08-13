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
    large: tokens.spacing.xl,
  };

  return (
    <MuiCard 
      {...props}
      sx={{
        backgroundColor: tokens.colors.surface,
        boxShadow: tokens.shadows.soft,
        borderRadius: tokens.radius,
        ...props.sx,
      }}
    >
      {(title || subtitle) && (
        <CardHeader 
          title={title}
          subheader={subtitle}
          sx={{
            color: tokens.colors.text.primary,
            '& .MuiCardHeader-subheader': {
              color: tokens.colors.text.muted,
            },
          }}
        />
      )}
      <CardContent sx={{ padding: paddingValues[padding] }}>
        {children}
      </CardContent>
    </MuiCard>
  );
};
