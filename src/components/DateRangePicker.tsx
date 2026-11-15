import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Paper,
  Stack,
  Grid,
  Chip,
  IconButton,
  useTheme,
  alpha,
  Divider,
  TextField,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Close as CloseIcon,
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { fromDateInputValue, isValidRange, presetRange, PresetId, toDateInputValue } from './dateRange';

interface DateRangePickerProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onDateChange: (startDate: Date | null, endDate: Date | null) => void;
  onClear: () => void;
  disabled?: boolean;
}

interface PresetRange {
  label: string;
  icon: React.ReactNode;
  value: PresetId;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onDateChange,
  onClear,
  disabled = false,
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate || null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate || null);

  const presetRanges: PresetRange[] = [
    { label: 'היום', icon: <TodayIcon />, value: 'today' },
    { label: 'שבוע אחרון', icon: <CalendarIcon />, value: 'week' },
    { label: 'חודש אחרון', icon: <CalendarIcon />, value: 'month' },
    { label: '3 חודשים', icon: <CalendarIcon />, value: '3months' },
    { label: '6 חודשים', icon: <CalendarIcon />, value: '6months' },
    { label: 'שנה אחרונה', icon: <CalendarIcon />, value: 'year' },
  ];
  const rangeIsValid = isValidRange(tempStartDate, tempEndDate);

  const handleOpen = () => {
    setTempStartDate(startDate || null);
    setTempEndDate(endDate || null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setTempStartDate(startDate || null);
    setTempEndDate(endDate || null);
  };

  const handleApply = () => {
    if (!rangeIsValid) return;
    onDateChange(tempStartDate, tempEndDate);
    setOpen(false);
  };

  const handlePresetSelect = (preset: PresetRange) => {
    const { start, end } = presetRange(preset.value);
    setTempStartDate(start);
    setTempEndDate(end);
  };

  const handleClear = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    onClear();
    setOpen(false);
  };

  const formatDateRange = () => {
    if (!startDate && !endDate) return 'בחר טווח תאריכים';
    if (startDate && !endDate) return `מ-${startDate.toLocaleDateString('he-IL')}`;
    if (!startDate && endDate) return `עד ${endDate.toLocaleDateString('he-IL')}`;
    if (startDate && endDate) {
      const start = startDate.toLocaleDateString('he-IL');
      const end = endDate.toLocaleDateString('he-IL');
      return `${start} - ${end}`;
    }
    return 'בחר טווח תאריכים';
  };

  const isPresetSelected = (preset: PresetRange) => {
    if (!tempStartDate || !tempEndDate) return false;
    const { start, end } = presetRange(preset.value);
    return (
      tempStartDate.toDateString() === start.toDateString() &&
      tempEndDate.toDateString() === end.toDateString()
    );
  };

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleOpen}
        disabled={disabled}
        startIcon={<DateRangeIcon />}
        endIcon={<CalendarIcon />}
        sx={{
          minWidth: 320,
          justifyContent: 'space-between',
          textTransform: 'none',
          fontSize: '1rem',
          py: 1.8,
          px: 3,
          borderRadius: 3,
          border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          background: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: theme.palette.primary.main,
            background: alpha(theme.palette.primary.main, 0.05),
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            transform: 'translateY(-1px)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {formatDateRange()}
          </Typography>
          {(startDate || endDate) && (
            <Chip
              label="פעיל"
              size="small"
              color="primary"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: 3,
            minHeight: 500,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                בחירת טווח תאריכים
              </Typography>
              <Typography variant="body2" color="text.secondary">
                בחר תאריכי התחלה וסיום לסינון הדוח
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Preset Options */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: alpha(theme.palette.grey[100], 0.5),
                  borderRadius: 2,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  טווחים מוגדרים מראש
                </Typography>
                <Stack spacing={1}>
                  {presetRanges.map((preset) => (
                    <Button
                      key={preset.value}
                      variant={isPresetSelected(preset) ? 'contained' : 'outlined'}
                      onClick={() => handlePresetSelect(preset)}
                      startIcon={preset.icon}
                      endIcon={
                        isPresetSelected(preset) ? <CheckIcon fontSize="small" /> : null
                      }
                      sx={{
                        justifyContent: 'flex-start',
                        textTransform: 'none',
                        py: 1,
                        fontSize: '0.9rem',
                      }}
                      fullWidth
                    >
                      {preset.label}
                    </Button>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            {/* Date Selectors */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  בחירה מותאמת אישית
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="תאריך התחלה"
                      type="date"
                      value={toDateInputValue(tempStartDate)}
                      onChange={(e) => setTempStartDate(fromDateInputValue(e.target.value))}
                      fullWidth
                      variant="outlined"
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="תאריך סיום"
                      type="date"
                      value={toDateInputValue(tempEndDate)}
                      onChange={(e) => setTempEndDate(fromDateInputValue(e.target.value))}
                      fullWidth
                      variant="outlined"
                      error={!rangeIsValid}
                      helperText={rangeIsValid ? undefined : 'תאריך הסיום לפני תאריך ההתחלה'}
                      inputProps={{
                        min: toDateInputValue(tempStartDate) || undefined,
                      }}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Selected Range Display */}
              {(tempStartDate || tempEndDate) && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                  }}
                >
                  <Typography variant="body2" color="info.main" sx={{ fontWeight: 500 }}>
                    📅 טווח נבחר:{' '}
                    {tempStartDate
                      ? tempStartDate.toLocaleDateString('he-IL')
                      : 'ההתחלה'}{' '}
                    -{' '}
                    {tempEndDate ? tempEndDate.toLocaleDateString('he-IL') : 'עכשיו'}
                  </Typography>
                </Paper>
              )}
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mt: 4,
              pt: 2,
              borderTop: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Button
              variant="outlined"
              onClick={handleClear}
              startIcon={<CloseIcon />}
              sx={{ textTransform: 'none' }}
            >
              נקה הכל
            </Button>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={handleClose}
                sx={{ textTransform: 'none' }}
              >
                ביטול
              </Button>
              <Button
                variant="contained"
                onClick={handleApply}
                disabled={!rangeIsValid}
                startIcon={<CheckIcon />}
                sx={{ textTransform: 'none', minWidth: 100 }}
              >
                החל
              </Button>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DateRangePicker;