import React from 'react';
import { Box, Typography } from '@mui/material';
import { tokens } from '../../app/theme';

/**
 * V3: flat management list (users, fridges, catalog) in the same language as the inventory rows —
 * thin separators, small tags, compact named actions; no card per record.
 */
const LINE = `1px solid ${tokens.colors.line}`;

export const ManagementList: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label }) => (
  <Box
    role={label ? 'list' : undefined}
    aria-label={label}
    sx={{
      mx: { xs: -1.5, sm: 0 },
      // Explicit colour in every breakpoint: a responsive `border: 1` resets the colour to currentColor.
      borderTop: LINE,
      border: { sm: LINE },
      borderRadius: { sm: 2 },
      overflow: 'clip',
      bgcolor: 'background.paper',
    }}
  >
    {children}
  </Box>
);

type TagTone = 'neutral' | 'primary' | 'danger';
const TAG_COLOR: Record<TagTone, string> = {
  neutral: tokens.colors.text.muted,
  primary: tokens.colors.primary,
  danger: tokens.colors.danger,
};

/** Small bordered text label (department, role, unit…). Meaning is in the text, not the colour. */
export const Tag: React.FC<{ children: React.ReactNode; tone?: TagTone; dir?: 'ltr' | 'rtl' }> = ({ children, tone = 'neutral', dir }) => (
  <Box
    component="span"
    dir={dir}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      px: 0.75,
      minHeight: 22,
      border: 1,
      borderColor: tone === 'neutral' ? tokens.colors.lineStrong : TAG_COLOR[tone],
      borderRadius: 1,
      fontSize: '0.75rem',
      fontWeight: 700,
      lineHeight: 1.4,
      color: TAG_COLOR[tone],
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </Box>
);

export interface ManagementRowProps {
  /** Accessible name of the row (usually the record's display name). */
  label: string;
  title: React.ReactNode;
  headingComponent?: 'h2' | 'h3' | 'h4';
  /** Secondary line, e.g. email or product code. */
  subtitle?: React.ReactNode;
  tags?: React.ReactNode;
  /** Extra small details (created at, phone…). */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  muted?: boolean;
  /** Passed through for existing selectors (e.g. data-user-row). */
  dataAttributes?: Record<string, string | boolean>;
}

export const ManagementRow: React.FC<ManagementRowProps> = ({
  label,
  title,
  headingComponent = 'h3',
  subtitle,
  tags,
  meta,
  actions,
  muted,
  dataAttributes,
}) => (
  <Box
    component="article"
    aria-label={label}
    {...dataAttributes}
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      columnGap: 2,
      rowGap: 1,
      px: { xs: 1.5, md: 2 },
      py: 1.25,
      borderBottom: 1,
      borderColor: 'divider',
      '&:last-of-type': { borderBottom: 0 },
      opacity: muted ? 0.72 : 1,
    }}
  >
    <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
      <Typography component={headingComponent} sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.3, overflowWrap: 'anywhere' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography component="div" variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
          {subtitle}
        </Typography>
      )}
      {(tags || meta) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
          {tags}
          {meta && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              {meta}
            </Typography>
          )}
        </Box>
      )}
    </Box>
    {actions && (
      <Box sx={{ display: 'flex', gap: 1, flex: { xs: '1 1 100%', sm: '0 0 auto' }, '& > *': { flex: { xs: 1, sm: '0 0 auto' } } }}>
        {actions}
      </Box>
    )}
  </Box>
);
