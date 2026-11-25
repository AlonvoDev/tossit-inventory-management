import React, { useId, useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import CheckIcon from '@mui/icons-material/Check';
import { useOptionalAppearance } from './appearanceContext';
import { APPEARANCE_OPTIONS } from './appearancePreference';

/**
 * "נגישות" entry: appearance choice (בהיר / כהה / לפי המכשיר) saved on this device.
 * This is a display preference only; it is not a claim of full accessibility compliance.
 */
export const AccessibilityMenu: React.FC<{ color?: 'inherit' | 'default' }> = ({ color = 'inherit' }) => {
  const appearance = useOptionalAppearance();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const headingId = useId();
  const open = !!anchor;
  if (!appearance) return null;
  const { preference, saved, setPreference } = appearance;

  return (
    <>
      <Tooltip title="נגישות">
        <IconButton
          color={color}
          aria-label="נגישות"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={event => setAnchor(event.currentTarget)}
          sx={{ width: 44, height: 44 }}
        >
          <AccessibilityNewIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        MenuListProps={{ 'aria-labelledby': headingId, dense: false }}
      >
        <ListSubheader id={headingId} disableSticky sx={{ lineHeight: '36px', fontWeight: 700, bgcolor: 'transparent' }}>
          נגישות · מראה
        </ListSubheader>
        {APPEARANCE_OPTIONS.map(option => {
          const selected = preference === option.value;
          return (
            <MenuItem
              key={option.value}
              role="menuitemradio"
              aria-checked={selected}
              selected={selected}
              onClick={() => {
                setPreference(option.value);
                setAnchor(null);
              }}
              sx={{ minHeight: 48, minWidth: 200 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>{selected ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
              <ListItemText primary={option.label} secondary={option.value === 'system' ? 'בהיר או כהה לפי הגדרות המכשיר' : undefined} />
            </MenuItem>
          );
        })}
        {!saved && (
          <Typography role="status" variant="body2" color="text.secondary" sx={{ px: 2, py: 1, maxWidth: 260 }}>
            הבחירה פעילה עכשיו, אך לא נשמרה במכשיר הזה.
          </Typography>
        )}
      </Menu>
    </>
  );
};
