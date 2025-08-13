import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@mui/material';
import { tokens } from '../../app/theme';

export interface ButtonProps extends Omit<MuiButtonProps, 'size'> {
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  loading = false, 
  disabled,
  size = 'medium',
  ...props 
}) => {
  const sizeStyles = {
    small: { padding: `${tokens.spacing.sm} ${tokens.spacing.md}`, fontSize: '13px' },
    medium: { padding: `${tokens.spacing.md} ${tokens.spacing.lg}`, fontSize: tokens.typography.fontSize.base },
    large: { padding: `${tokens.spacing.lg} ${tokens.spacing.xl}`, fontSize: tokens.typography.fontSize.lg },
  };

  return (
    <MuiButton
      disabled={disabled || loading}
      sx={sizeStyles[size]}
      {...props}
    >
      {loading ? 'טוען...' : children}
    </MuiButton>
  );
};
