import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Divider, FormControlLabel, Switch, Typography } from '@mui/material';
import { Card, Button } from '../../components/ui';
import { tokens } from '../../app/theme';
import { useAuth } from '../../context/AuthContext';
import { getBusinessSettings, saveBusinessSettings } from '../../api/settingsAPI';
import type { BusinessSettings } from '../../domain/contracts';
import { departmentLabel, ROLE_LABELS, toAppRole } from '../../app/access';
import { errorMessage } from '../common/errorMessage';

type BooleanSetting = 'eveningRemindersEnabled' | 'morningSummaryEnabled' | 'autoEndShiftsAtMidnight';

const SETTINGS: { key: BooleanSetting; label: string; help: string }[] = [
  {
    key: 'eveningRemindersEnabled',
    label: 'תזכורות ערב לעובדים',
    help: 'בשעות 23:00, 23:20 ו-23:40, לעובדים במשמרת במחלקה שיש בה פריטים שפג תוקפם.',
  },
  {
    key: 'morningSummaryEnabled',
    label: 'סיכום בוקר למנהלים',
    help: 'בשעה 08:00, סיכום פריטים שפג תוקפם ולא טופלו, למנהלי המערכת ולמנהלי המחלקות.',
  },
  {
    key: 'autoEndShiftsAtMidnight',
    label: 'סיום משמרות אוטומטי בחצות',
    help: 'משמרות פתוחות יסתיימו אוטומטית בחצות לפי שעון ישראל.',
  },
];

const sameSettings = (a: BusinessSettings | null, b: BusinessSettings | null) =>
  !!a && !!b && SETTINGS.every(({ key }) => a[key] === b[key]) && a.timezone === b.timezone;

/**
 * Business settings (admin only; route-guarded). Values come from and are written to the
 * server; success is shown only after the save is acknowledged.
 */
export const SettingsPage: React.FC = () => {
  const { userProfile, isOffline } = useAuth();
  const [saved, setSaved] = useState<BusinessSettings | null>(null);
  const [draft, setDraft] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const settings = await getBusinessSettings();
      setSaved(settings);
      setDraft(settings);
    } catch (err) {
      console.error('Error loading settings:', err);
      setLoadError(errorMessage(err, 'טעינת ההגדרות נכשלה. נסה שוב.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (key: BooleanSetting) => (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setDraft(prev => (prev ? { ...prev, [key]: checked } : prev));
    setSuccess(null);
    setSaveError(null);
  };

  const dirty = !!draft && !sameSettings(draft, saved);

  const save = async () => {
    if (!draft || !dirty || saving) return;
    setSaving(true);
    setSaveError(null);
    setSuccess(null);
    try {
      await saveBusinessSettings(draft);
      setSaved(draft);
      setSuccess('ההגדרות נשמרו');
    } catch (err) {
      console.error('Error saving settings:', err);
      setSaveError(errorMessage(err, 'שמירת ההגדרות נכשלה. השינויים לא נשמרו.'));
    } finally {
      setSaving(false);
    }
  };

  if (!userProfile) {
    return (
      <Card title="שגיאה">
        <Typography>לא ניתן לטעון את פרופיל המשתמש</Typography>
      </Card>
    );
  }

  const role = toAppRole(userProfile.role);

  return (
    <Box sx={{ maxWidth: '800px', margin: '0 auto' }}>
      <Typography
        variant="h1"
        sx={{ marginBottom: tokens.spacing.xl, color: tokens.colors.text.primary, fontSize: { xs: '1.75rem', sm: '2.25rem' } }}
      >
        הגדרות
      </Typography>

      <Card title="הגדרות העסק" padding="large">
        {loading ? (
          <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
            <CircularProgress size={24} />
            <Typography color="text.secondary">טוען הגדרות...</Typography>
          </Box>
        ) : loadError || !draft ? (
          <Alert
            severity="error"
            action={
              <Button size="small" variant="text" onClick={load}>
                נסה שוב
              </Button>
            }
          >
            {loadError ?? 'טעינת ההגדרות נכשלה.'}
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
            <Typography variant="body2" color="text.secondary">
              אזור זמן: שעון ישראל (Asia/Jerusalem). כל הזמנים בהגדרות אלו לפי שעון העסק.
            </Typography>
            <Divider />
            {SETTINGS.map(({ key, label, help }) => (
              <Box key={key}>
                <FormControlLabel
                  control={<Switch checked={draft[key]} onChange={toggle(key)} disabled={saving} color="primary" />}
                  label={label}
                />
                <Typography variant="body2" color="text.secondary" sx={{ pr: 6 }}>
                  {help}
                </Typography>
              </Box>
            ))}

            <Alert severity="info">
              ההגדרות נשמרות לעסק. תזכורות וסיכומים נשלחים רק לאחר הפעלת שירות ההתראות בשרת, ורק למכשירים שבהם
              המשתמש הפעיל התראות.
            </Alert>

            {saveError && <Alert severity="error">{saveError}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            {isOffline && <Alert severity="warning">אין חיבור. אפשר לשמור הגדרות רק כשיש חיבור לשרת.</Alert>}

            <Box sx={{ display: 'flex', gap: tokens.spacing.md }}>
              <Button onClick={save} variant="contained" disabled={!dirty || saving || !!isOffline}>
                {saving ? 'שומר...' : 'שמירת הגדרות'}
              </Button>
              {dirty && !saving && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setDraft(saved);
                    setSaveError(null);
                  }}
                >
                  ביטול שינויים
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Card>

      <Card title="מידע משתמש" padding="large" sx={{ marginTop: tokens.spacing.xl }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
          <Typography variant="body1">
            <strong>שם:</strong> {userProfile.fullName || userProfile.email}
          </Typography>
          <Typography variant="body1">
            <strong>דוא״ל:</strong> {userProfile.email}
          </Typography>
          <Typography variant="body1">
            <strong>תפקיד:</strong> {role ? ROLE_LABELS[role] : '-'}
          </Typography>
          <Typography variant="body1">
            <strong>מחלקה:</strong> {role === 'admin' ? 'כל המחלקות' : departmentLabel(userProfile.department) ?? 'לא מוגדרת'}
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};
