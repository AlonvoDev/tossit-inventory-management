import React, { useState, useCallback } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Card, Button } from '../../components/ui';
import { tokens } from '../../app/theme';
import DiscardReport from '../../components/DiscardReport';
import { useAuth } from '../../hooks/useAuth';

export const ReportsPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [reportType, setReportType] = useState<string>('discard');
  const [dateRange, setDateRange] = useState<string>('week');

  const handleReportTypeChange = useCallback((value: string) => {
    setReportType(value);
  }, []);

  const handleDateRangeChange = useCallback((value: string) => {
    setDateRange(value);
  }, []);

  const generateReport = useCallback(() => {
    // Logic to generate report
    console.log('Generating report:', { reportType, dateRange });
  }, [reportType, dateRange]);

  if (!userProfile) {
    return (
      <Card title="שגיאה">
        <Typography>לא ניתן לטעון את פרופיל המשתמש</Typography>
      </Card>
    );
  }

  return (
    <Box sx={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Typography 
        variant="h1" 
        sx={{ 
          marginBottom: tokens.spacing.xl,
          color: tokens.colors.text.primary 
        }}
      >
        דוחות
      </Typography>

      <Card title="הגדרות דוח" padding="large">
        <Box sx={{ display: 'flex', gap: tokens.spacing.lg, marginBottom: tokens.spacing.lg }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>סוג דוח</InputLabel>
            <Select
              value={reportType}
              label="סוג דוח"
              onChange={(e) => handleReportTypeChange(e.target.value)}
            >
              <MenuItem value="discard">דוח פסולת</MenuItem>
              <MenuItem value="inventory">דוח מלאי</MenuItem>
              <MenuItem value="expiry">דוח תפוגה</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>טווח תאריכים</InputLabel>
            <Select
              value={dateRange}
              label="טווח תאריכים"
              onChange={(e) => handleDateRangeChange(e.target.value)}
            >
              <MenuItem value="today">היום</MenuItem>
              <MenuItem value="week">השבוע</MenuItem>
              <MenuItem value="month">החודש</MenuItem>
              <MenuItem value="quarter">הרבעון</MenuItem>
            </Select>
          </FormControl>

          <Button onClick={generateReport} variant="contained">
            יצירת דוח
          </Button>
        </Box>
      </Card>

      <Box sx={{ marginTop: tokens.spacing.xl }}>
        {reportType === 'discard' && (
          <DiscardReport businessId={userProfile.businessId} />
        )}
        
        {reportType === 'inventory' && (
          <Card title="דוח מלאי">
            <Typography>דוח מלאי יוצג כאן</Typography>
          </Card>
        )}
        
        {reportType === 'expiry' && (
          <Card title="דוח תפוגה">
            <Typography>דוח תפוגה יוצג כאן</Typography>
          </Card>
        )}
      </Box>
    </Box>
  );
};
