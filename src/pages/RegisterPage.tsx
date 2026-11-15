import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Container, Card, CardContent, Typography, Box, Button, List, ListItem, ListItemText } from '@mui/material';
import tossitLogo from '../assets/tossit-logo.png';

/**
 * Public self-signup is intentionally not offered: accounts, business membership,
 * roles and departments are controlled by the business admin (see delivery plan U1/C1).
 * This page explains how to get access instead of creating any account or profile.
 */
const RegisterPage: React.FC = () => (
  <Container maxWidth="sm" sx={{ mt: 6, direction: 'rtl' }}>
    <Card elevation={3}>
      <CardContent sx={{ py: 5, px: { xs: 3, sm: 5 } }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box component="img" src={tossitLogo} alt="TossIt" sx={{ height: 60, width: 'auto', maxWidth: '100%' }} />
        </Box>

        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
          איך מקבלים גישה ל-TossIt?
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 2 }}>
          אין הרשמה עצמית לאפליקציה. משתמשים נפתחים על ידי מנהל העסק, שקובע גם את התפקיד והמחלקה.
        </Typography>

        <List dense sx={{ mb: 3 }}>
          <ListItem disableGutters>
            <ListItemText primary="1. פנה למנהל העסק ובקש שיפתח עבורך משתמש." />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary="2. קבל ממנו את כתובת הדוא״ל והסיסמה הראשונית." />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText primary="3. התחבר במסך הכניסה." />
          </ListItem>
        </List>

        <Button component={RouterLink} to="/login" variant="contained" fullWidth size="large">
          חזרה למסך הכניסה
        </Button>
      </CardContent>
    </Card>
  </Container>
);

export default RegisterPage;
