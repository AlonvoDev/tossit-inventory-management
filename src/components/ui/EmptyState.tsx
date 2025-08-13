import React from 'react';
import { Box, Typography } from '@mui/material';
import { tokens } from '../../app/theme';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: tokens.spacing.xxl,
        minHeight: '200px',
      }}
    >
      {icon && (
        <Box
          sx={{
            marginBottom: tokens.spacing.lg,
            color: tokens.colors.text.muted,
            fontSize: '3rem',
          }}
        >
          {icon}
        </Box>
      )}
      
      <Typography
        variant="h3"
        sx={{
          marginBottom: tokens.spacing.sm,
          color: tokens.colors.text.primary,
        }}
      >
        {title}
      </Typography>
      
      {description && (
        <Typography
          variant="body2"
          sx={{
            marginBottom: action ? tokens.spacing.lg : 0,
            maxWidth: '400px',
            color: tokens.colors.text.muted,
          }}
        >
          {description}
        </Typography>
      )}
      
      {action && action}
    </Box>
  );
};
