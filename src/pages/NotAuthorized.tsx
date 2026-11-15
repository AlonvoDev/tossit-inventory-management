import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Lock as LockIcon, Home as HomeIcon, Logout as LogoutIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

/**
 * - role: signed in with a valid profile, but the role may not open this screen.
 * - no-profile: signed in, but no active business profile grants access.
 * - profile-error: signed in, but the profile could not be loaded (e.g. network).
 */
export type NotAuthorizedReason = 'role' | 'no-profile' | 'profile-error';

interface NotAuthorizedProps {
  reason?: NotAuthorizedReason;
}

const COPY: Record<NotAuthorizedReason, { title: string; subtitle: string; body: string }> = {
  role: {
    title: 'אין הרשאה',
    subtitle: 'אין לך הרשאה לגשת לדף זה',
    body: 'הדף שניסית לפתוח אינו זמין לתפקיד שלך. אם לדעתך זו טעות, פנה למנהל העסק.',
  },
  'no-profile': {
    title: 'אין גישה לאפליקציה',
    subtitle: 'החשבון שלך אינו פעיל בעסק',
    body: 'לא נמצאה הרשאה פעילה עבור החשבון הזה. הגישה ל-TossIt ניתנת על ידי מנהל העסק בלבד. פנה למנהל כדי שיפתח או יפעיל עבורך משתמש, ואז התחבר שוב.',
  },
  'profile-error': {
    title: 'לא ניתן לטעון את פרטי ההרשאה',
    subtitle: 'הפרופיל שלך לא נטען',
    body: 'לא הצלחנו לטעון את פרטי המשתמש וההרשאות שלך. בדוק את החיבור לאינטרנט ונסה שוב.',
  },
};

const NotAuthorized: React.FC<NotAuthorizedProps> = ({ reason = 'role' }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const copy = COPY[reason];

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, direction: 'rtl' }}>
      <Card elevation={3}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Box sx={{ mb: 3 }}>
            <LockIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          </Box>

          <Typography variant="h4" component="h1" gutterBottom color="error">
            {copy.title}
          </Typography>

          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            {copy.subtitle}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {copy.body}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {reason === 'role' && (
              <>
                <Button
                  variant="contained"
                  startIcon={<HomeIcon />}
                  onClick={() => navigate('/dashboard')}
                  size="large"
                >
                  חזרה לדף הבית
                </Button>
                <Button variant="outlined" onClick={() => navigate(-1)} size="large">
                  חזרה
                </Button>
              </>
            )}

            {reason === 'profile-error' && (
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
                size="large"
              >
                נסה שוב
              </Button>
            )}

            {reason !== 'role' && user && (
              <Button
                variant={reason === 'no-profile' ? 'contained' : 'outlined'}
                color="error"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                size="large"
              >
                התנתק
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default NotAuthorized;
