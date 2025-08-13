import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { tokens } from '../../app/theme';

interface MultiColumnLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  sidebarWidth?: number | string;
  gap?: number | string;
  minMainWidth?: number | string;
  className?: string;
}

/**
 * Multi-column layout component optimized for desktop screens
 * Automatically collapses to single column on mobile
 */
export const MultiColumnLayout: React.FC<MultiColumnLayoutProps> = ({
  children,
  sidebar,
  sidebarWidth = 300,
  gap = tokens.spacing.lg,
  minMainWidth = 600,
  className
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isLarge = useMediaQuery(theme.breakpoints.up('lg'));
  const isXtraLarge = useMediaQuery(theme.breakpoints.up('xl'));

  // Don't show sidebar on mobile unless specifically designed for it
  const showSidebar = !isMobile && sidebar;

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap,
        width: '100%',
        minHeight: '100%',
        
        // Optimize for ultra-wide screens
        ...(isXtraLarge && {
          maxWidth: '1800px',
          margin: '0 auto',
        }),
      }}
    >
      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0, // Allow shrinking
          
          // Ensure main content doesn't get too narrow
          ...(showSidebar && {
            minWidth: minMainWidth,
          }),
          
          // On large screens, optimize layout
          ...(isLarge && !isMobile && {
            display: 'flex',
            flexDirection: 'column',
          }),
        }}
      >
        {children}
      </Box>

      {/* Sidebar */}
      {showSidebar && (
        <Box
          component="aside"
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            
            // Sticky sidebar on desktop
            position: 'sticky',
            top: tokens.spacing.xl,
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            
            // Add some visual separation
            padding: tokens.spacing.md,
            backgroundColor: tokens.colors.surface,
            borderRadius: tokens.radius,
            border: `1px solid ${tokens.colors.text.muted}20`,
          }}
        >
          {sidebar}
        </Box>
      )}
    </Box>
  );
};

export default MultiColumnLayout;
