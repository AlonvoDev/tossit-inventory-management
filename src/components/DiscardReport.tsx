import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDiscardReport, DiscardReportItem } from '../api/firestoreAPI';
import DateRangePicker from './DateRangePicker';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  Delete as DeleteIcon,
  Assessment as AssessmentIcon,
  DateRange as DateIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

type SortKey = 'productName' | 'totalQuantity' | 'discardCount' | 'averageQuantity' | 'lastDiscarded';
type SortOrder = 'asc' | 'desc';

interface DiscardReportProps {
  businessId: string;
}

const DiscardReport: React.FC<DiscardReportProps> = ({ businessId: propBusinessId }) => {
  const { businessId: authBusinessId } = useAuth();
  const businessId = propBusinessId || authBusinessId;
  const theme = useTheme();
  const [reportData, setReportData] = useState<DiscardReportItem[]>([]);
  const [filteredData, setFilteredData] = useState<DiscardReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalQuantity');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Date filtering state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [dateFilterActive, setDateFilterActive] = useState(false);

  // Load report data
  const loadReport = useCallback(async () => {
    if (!businessId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let endDateWithTime: Date | undefined;
      if (endDate) {
        endDateWithTime = new Date(endDate);
        endDateWithTime.setHours(23, 59, 59, 999); // Include end of day
      }
      
      const data = await getDiscardReport(businessId, startDate || undefined, endDateWithTime);
      setReportData(data);
      setFilteredData(data);
    } catch (err: unknown) {
      console.error('Error loading discard report:', err);
      setError('שגיאה בטעינת הדוח. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  }, [businessId, startDate, endDate]);

  // Load data when component mounts or when date filters change
  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Filter and sort data
  useEffect(() => {
    const filtered = reportData.filter(item =>
      item.productName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort data
    filtered.sort((a, b) => {
      let aValue: string | number | Date | undefined = a[sortKey];
      let bValue: string | number | Date | undefined = b[sortKey];
      
      if (sortKey === 'lastDiscarded') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }
      
      // Ensure values are not undefined
      const aVal = aValue ?? 0;
      const bVal = bValue ?? 0;
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredData(filtered);
  }, [reportData, searchQuery, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  // Calculate summary statistics
  const totalQuantityDiscarded = reportData.reduce((sum, item) => sum + item.totalQuantity, 0);
  const totalDiscardEvents = reportData.reduce((sum, item) => sum + item.discardCount, 0);
  const totalProducts = reportData.length;
  const avgQuantityPerEvent = totalDiscardEvents > 0 ? totalQuantityDiscarded / totalDiscardEvents : 0;

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'expired': return theme.palette.warning.main;
      case 'damaged': return theme.palette.error.main;
      default: return theme.palette.info.main;
    }
  };



  // Date range handling functions
  const handleDateRangeChange = (newStartDate: Date | null, newEndDate: Date | null) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setDateFilterActive(!!(newStartDate || newEndDate));
  };

  const handleClearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setDateFilterActive(false);
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'לא זמין';
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={50} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          טוען דוח זריקות...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          📊 דוח זריקות מסוכם
        </Typography>
        <Typography variant="body1" color="text.secondary">
          סיכום מלא של כל הזריקות במערכת לפי מוצרים
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssessmentIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {totalProducts}
              </Typography>
              <Typography variant="body2">
                סוגי מוצרים שנזרקו
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <DeleteIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {totalQuantityDiscarded.toFixed(1)}
              </Typography>
              <Typography variant="body2">
                כמות כוללת נזרקת
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`,
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {totalDiscardEvents}
              </Typography>
              <Typography variant="body2">
                אירועי זריקה
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <DateIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {avgQuantityPerEvent.toFixed(1)}
              </Typography>
              <Typography variant="body2">
                ממוצע לאירוע
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Box sx={{ mb: 4 }}>
        {/* Date Range Filter */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <FilterIcon sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              סינון לפי תאריכים
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateChange={handleDateRangeChange}
              onClear={handleClearDateFilter}
            />
          </Box>
            
          {dateFilterActive && (startDate || endDate) && (
            <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 1 }}>
              <Typography variant="body2" color="info.main" sx={{ textAlign: 'center' }}>
                📅 מציג נתונים מ-{startDate ? startDate.toLocaleDateString('he-IL') : 'ההתחלה'} 
                עד {endDate ? endDate.toLocaleDateString('he-IL') : 'עכשיו'}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Search */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <TextField
            placeholder="חיפוש מוצרים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 400, width: '100%' }}
          />
        </Box>
      </Box>

      {/* Report Table */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ background: alpha(theme.palette.primary.main, 0.1) }}>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortKey === 'productName'}
                    direction={sortKey === 'productName' ? sortOrder : 'asc'}
                    onClick={() => handleSort('productName')}
                    sx={{ fontWeight: 600 }}
                  >
                    שם המוצר
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">
                  <TableSortLabel
                    active={sortKey === 'totalQuantity'}
                    direction={sortKey === 'totalQuantity' ? sortOrder : 'asc'}
                    onClick={() => handleSort('totalQuantity')}
                    sx={{ fontWeight: 600 }}
                  >
                    כמות כוללת נזרקת
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">
                  <TableSortLabel
                    active={sortKey === 'discardCount'}
                    direction={sortKey === 'discardCount' ? sortOrder : 'asc'}
                    onClick={() => handleSort('discardCount')}
                    sx={{ fontWeight: 600 }}
                  >
                    מספר זריקות
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">
                  <TableSortLabel
                    active={sortKey === 'averageQuantity'}
                    direction={sortKey === 'averageQuantity' ? sortOrder : 'asc'}
                    onClick={() => handleSort('averageQuantity')}
                    sx={{ fontWeight: 600 }}
                  >
                    ממוצע לזריקה
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  סיבות זריקה
                </TableCell>
                <TableCell align="center">
                  <TableSortLabel
                    active={sortKey === 'lastDiscarded'}
                    direction={sortKey === 'lastDiscarded' ? sortOrder : 'asc'}
                    onClick={() => handleSort('lastDiscarded')}
                    sx={{ fontWeight: 600 }}
                  >
                    זריקה אחרונה
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow 
                  key={item.productName}
                  sx={{ 
                    '&:nth-of-type(odd)': { 
                      backgroundColor: alpha(theme.palette.primary.main, 0.02) 
                    },
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05)
                    }
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {item.productName}
                      </Typography>
                      <Chip 
                        label={item.type === 'kg' ? 'ק"ג' : 'יחידות'} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="h6" sx={{ 
                      fontWeight: 600,
                      color: theme.palette.error.main 
                    }}>
                      {item.totalQuantity.toFixed(item.type === 'kg' ? 1 : 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={item.discardCount} 
                      color="warning" 
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {item.averageQuantity.toFixed(item.type === 'kg' ? 1 : 0)}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {item.reasons.expired > 0 && (
                        <Chip 
                          label={`פג תוקף: ${item.reasons.expired}`}
                          size="small"
                          sx={{ 
                            bgcolor: alpha(getReasonColor('expired'), 0.1),
                            color: getReasonColor('expired'),
                            fontWeight: 600
                          }}
                        />
                      )}
                      {item.reasons.damaged > 0 && (
                        <Chip 
                          label={`נפגם: ${item.reasons.damaged}`}
                          size="small"
                          sx={{ 
                            bgcolor: alpha(getReasonColor('damaged'), 0.1),
                            color: getReasonColor('damaged'),
                            fontWeight: 600
                          }}
                        />
                      )}
                      {item.reasons.other > 0 && (
                        <Chip 
                          label={`אחר: ${item.reasons.other}`}
                          size="small"
                          sx={{ 
                            bgcolor: alpha(getReasonColor('other'), 0.1),
                            color: getReasonColor('other'),
                            fontWeight: 600
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(item.lastDiscarded)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {filteredData.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            אין נתונים להצגה
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery ? 'לא נמצאו מוצרים התואמים לחיפוש' : 'עדיין לא בוצעו זריקות במערכת'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DiscardReport;