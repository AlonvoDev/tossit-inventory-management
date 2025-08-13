import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { tokens } from '../../app/theme';

interface GridViewProps {
  children: React.ReactNode;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number | string;
  minItemWidth?: number | string;
  className?: string;
}

/**
 * Responsive grid component that adapts to screen size
 * Optimized for both mobile and desktop viewing
 */
export const GridView: React.FC<GridViewProps> = ({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
  gap = tokens.spacing.md,
  minItemWidth = 280,
  className
}) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));

  const getColumns = () => {
    if (isXs) return columns.xs || 1;
    if (isSm) return columns.sm || 2;
    if (isMd) return columns.md || 3;
    if (isLg) return columns.lg || 4;
    if (isXl) return columns.xl || 5;
    return 3; // fallback
  };

  const gridColumns = getColumns();

  return (
    <Box
      className={className}
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gap,
        width: '100%',
        
        // Alternative: use auto-fit for truly responsive columns
        '@media (min-width: 1400px)': {
          gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`,
        },
        
        // Ensure items don't get too narrow on smaller screens
        '& > *': {
          minWidth: 0, // Allow flex items to shrink below their content size
        },
      }}
    >
      {children}
    </Box>
  );
};

export default GridView;
