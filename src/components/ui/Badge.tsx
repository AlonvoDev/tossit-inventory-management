import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { tokens } from '../../app/theme';

export interface BadgeProps extends Omit<ChipProps, 'color' | 'variant'> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'neutral',
  ...props 
}) => {
  const variantStyles = {
    success: {
      backgroundColor: tokens.colors.success,
      color: tokens.colors.surface,
    },
    warning: {
      backgroundColor: tokens.colors.warning,
      color: tokens.colors.surface,
    },
    danger: {
      backgroundColor: tokens.colors.danger,
      color: tokens.colors.surface,
    },
    info: {
      backgroundColor: tokens.colors.primary,
      color: tokens.colors.primaryContrast,
    },
    neutral: {
      backgroundColor: tokens.colors.text.muted,
      color: tokens.colors.surface,
    },
  };

  return (
    <Chip
      size="small"
      sx={{
        borderRadius: `calc(${tokens.radius} / 2)`,
        fontWeight: tokens.typography.fontWeight.medium,
        ...variantStyles[variant],
      }}
      {...props}
    />
  );
};
