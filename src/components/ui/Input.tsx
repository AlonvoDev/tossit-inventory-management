import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { tokens } from '../../app/theme';

export interface InputProps extends Omit<TextFieldProps, 'variant'> {
  variant?: 'outlined' | 'filled';
}

export const Input: React.FC<InputProps> = ({ 
  variant = 'outlined',
  ...props 
}) => {
  return (
    <TextField
      variant={variant}
      fullWidth
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: tokens.radius,
          backgroundColor: tokens.colors.surface,
          '&:hover': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: tokens.colors.primary,
            },
          },
          '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: tokens.colors.primary,
              borderWidth: '2px',
            },
          },
        },
        '& .MuiInputLabel-root': {
          color: tokens.colors.text.muted,
          '&.Mui-focused': {
            color: tokens.colors.primary,
          },
        },
      }}
      {...props}
    />
  );
};
