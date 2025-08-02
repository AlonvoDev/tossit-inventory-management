import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

const ClockDisplay: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup timer on component unmount
    return () => clearInterval(timer);
  }, []);

  // Format time as HH:MM:SS
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Format date as DD/MM/YYYY
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Box 
      sx={{ 
        textAlign: 'center', 
        p: 2,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        boxShadow: 1,
        minWidth: 200
      }}
    >
      <Typography 
        variant="h4" 
        component="div" 
        sx={{ 
          fontFamily: 'monospace',
          fontWeight: 'bold',
          color: 'primary.main'
        }}
      >
        {formatTime(currentTime)}
      </Typography>
      <Typography 
        variant="body2" 
        color="text.secondary"
        sx={{ mt: 1 }}
      >
        {formatDate(currentTime)}
      </Typography>
    </Box>
  );
};

export default ClockDisplay; 