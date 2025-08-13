import React, { useState, useCallback } from 'react';
import { Box, Typography, Switch, FormControlLabel, Divider } from '@mui/material';
import { Card, Button, Input } from '../../components/ui';
import { tokens } from '../../app/theme';
import { useAuth } from '../../hooks/useAuth';

export const SettingsPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [companyName, setCompanyName] = useState('');

  const handleNotificationsChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setNotifications(event.target.checked);
  }, []);

  const handleAutoSyncChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSync(event.target.checked);
  }, []);

  const handleCompanyNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyName(event.target.value);
  }, []);

  const saveSettings = useCallback(() => {
    console.log('Saving settings:', { notifications, autoSync, companyName });
    // Implementation for saving settings
  }, [notifications, autoSync, companyName]);

  if (!userProfile) {
    return (
      <Card title="שגיאה">
        <Typography>לא ניתן לטעון את פרופיל המשתמש</Typography>
      </Card>
    );
  }

  return (
    <Box sx={{ maxWidth: '800px', margin: '0 auto' }}>
      <Typography 
        variant="h1" 
        sx={{ 
          marginBottom: tokens.spacing.xl,
          color: tokens.colors.text.primary 
        }}
      >
        הגדרות
      </Typography>

      <Card title="הגדרות כלליות" padding="large">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
          <Input
            label="שם החברה"
            value={companyName}
            onChange={handleCompanyNameChange}
            placeholder="הזן שם חברה"
          />

          <Divider />

          <FormControlLabel
            control={
              <Switch
                checked={notifications}
                onChange={handleNotificationsChange}
                color="primary"
              />
            }
            label="התראות"
          />

          <FormControlLabel
            control={
              <Switch
                checked={autoSync}
                onChange={handleAutoSyncChange}
                color="primary"
              />
            }
            label="סנכרון אוטומטי"
          />

          <Box sx={{ marginTop: tokens.spacing.lg }}>
            <Button onClick={saveSettings} variant="contained">
              שמירת הגדרות
            </Button>
          </Box>
        </Box>
      </Card>

      <Card title="מידע משתמש" padding="large" sx={{ marginTop: tokens.spacing.xl }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
          <Typography variant="body1">
            <strong>שם:</strong> {userProfile.fullName || userProfile.email}
          </Typography>
          <Typography variant="body1">
            <strong>אימייל:</strong> {userProfile.email}
          </Typography>
          <Typography variant="body1">
            <strong>תפקיד:</strong> {userProfile.role}
          </Typography>
          <Typography variant="body1">
            <strong>מחלקה:</strong> {userProfile.department || 'לא מוגדר'}
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};
