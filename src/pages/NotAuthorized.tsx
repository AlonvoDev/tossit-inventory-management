import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Lock as LockIcon, Home as HomeIcon } from '@mui/icons-material';

const NotAuthorized: React.FC = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, direction: 'rtl' }}>
      <Card elevation={3}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Box sx={{ mb: 3 }}>
            <LockIcon 
              sx={{ 
                fontSize: 80, 
                color: 'error.main',
                mb: 2 
              }} 
            />
          </Box>
          
          <Typography variant="h4" component="h1" gutterBottom color="error">
            אין הרשאה
          </Typography>
          
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            אין לך הרשאה לגשת לדף זה
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            הדף שאתה מנסה לגשת אליו דורש הרשאות מנהל.
            אם אתה סבור שזו טעות, פנה למנהל המערכת.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
              size="large"
            >
              חזרה לדף הבית
            </Button>
            
            <Button
              variant="outlined"
              onClick={handleGoBack}
              size="large"
            >
              חזרה
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default NotAuthorized; 