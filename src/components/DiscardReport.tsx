import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDiscardReport, DiscardReportItem } from '../api/firestoreAPI';
import DateRangePicker from './DateRangePicker';
import { toQueryBounds } from './dateRange';
import type { DiscardReason } from '../domain/contracts';
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
  Chip,
  CircularProgress,
  Alert,
  Button,
  useTheme,
  useMediaQuery,
  alpha,
  TextField,
  InputAdornment,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
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
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
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
  // Totals are computed server-side for the selected reason only (C2 getDiscardReport reason filter).
  const [reason, setReason] = useState<DiscardReason | ''>('');

  // Load report data
  const loadReport = useCallback(async () => {
    if (!businessId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Whole local days: first day from 00:00, last day through 23:59:59.999.
      const bounds = toQueryBounds(startDate, endDate);
      const data = reason
        ? await getDiscardReport(businessId, bounds.start, bounds.end, reason)
        : await getDiscardReport(businessId, bounds.start, bounds.end);
      setReportData(data);
      setFilteredData(data);
    } catch (err: unknown) {
      console.error('Error loading discard report:', err);
      setError('שגיאה בטעינת הדוח. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  }, [businessId, startDate, endDate, reason]);

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
  const totalDiscardEvents = reportData.reduce((sum, item) => sum + item.discardCount, 0);
  const totalProducts = reportData.length;

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
      <Alert
        severity="error"
        sx={{ m: 2 }}
        action={
          <Button color="inherit" size="small" onClick={() => loadReport()}>
            נסה שוב
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  const kgTotal = reportData.filter(i => i.type === 'kg').reduce((sum, i) => sum + i.totalQuantity, 0);
  const unitsTotal = reportData.filter(i => i.type !== 'kg').reduce((sum, i) => sum + i.totalQuantity, 0);
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const reasonChips = (item: DiscardReportItem) => (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {item.reasons.expired > 0 && <Chip size="small" label={`פג תוקף: ${item.reasons.expired}`} sx={{ bgcolor: '#FFEDD5', color: '#7C2D12', fontWeight: 600 }} />}
      {item.reasons.damaged > 0 && <Chip size="small" label={`נפגם: ${item.reasons.damaged}`} sx={{ bgcolor: '#FFE4E6', color: '#9F1239', fontWeight: 600 }} />}
      {item.reasons.other > 0 && <Chip size="small" label={`אחר: ${item.reasons.other}`} sx={{ bgcolor: '#E5E7EB', color: '#374151', fontWeight: 600 }} />}
    </Box>
  );
  const stats: { label: string; value: string }[] = [
    { label: 'אירועי זריקה', value: String(totalDiscardEvents) },
    { label: 'מוצרים', value: String(totalProducts) },
    { label: 'נזרק בק״ג', value: round(kgTotal).toString() },
    { label: 'נזרק ביחידות', value: round(unitsTotal).toString() },
  ];

  return (
    <Box>
      <Typography component="h2" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
        דוח זריקות
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        כמויות שנזרקו לפי מוצר. ק״ג ויחידות מוצגים בנפרד.
      </Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
        <DateRangePicker startDate={startDate} endDate={endDate} onDateChange={handleDateRangeChange} onClear={handleClearDateFilter} />
        <TextField
          select
          size="small"
          label="סיבת זריקה"
          value={reason}
          onChange={(e) => setReason(e.target.value as DiscardReason | '')}
          sx={{ minWidth: 150, '& .MuiInputBase-root': { minHeight: 44 } }}
        >
          <MenuItem value="">כל הסיבות</MenuItem>
          <MenuItem value="expired">פג תוקף</MenuItem>
          <MenuItem value="damaged">נפגם</MenuItem>
          <MenuItem value="other">אחר</MenuItem>
        </TextField>
        <TextField
          size="small"
          label="חיפוש מוצר"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ flex: '1 1 180px', minWidth: 0, '& .MuiInputBase-root': { minHeight: 44 } }}
        />
      </Box>
      {dateFilterActive && (startDate || endDate) && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          מציג זריקות מ־{startDate ? startDate.toLocaleDateString('he-IL') : 'ההתחלה'} עד {endDate ? endDate.toLocaleDateString('he-IL') : 'היום'}
        </Typography>
      )}

      {/* Summary: plain counts, units never mixed */}
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }, my: 2 }}>
        {stats.map(stat => (
          <Paper key={stat.label} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              {stat.label}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '1.25rem' }}>{stat.value}</Typography>
          </Paper>
        ))}
      </Box>

      {isPhone && filteredData.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filteredData.map(item => (
            <Paper key={`${item.productName}|${item.type}`} component="article" variant="outlined" aria-label={item.productName} sx={{ p: 1.5, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', overflowWrap: 'anywhere' }}>{item.productName}</Typography>
                <Chip size="small" variant="outlined" label={item.type === 'kg' ? 'ק״ג' : 'יחידות'} />
              </Box>
              <Typography sx={{ fontWeight: 600 }}>
                נזרק: {item.totalQuantity.toFixed(item.type === 'kg' ? 1 : 0)} {item.type === 'kg' ? 'ק״ג' : 'יח׳'} · {item.discardCount} פעמים
              </Typography>
              {reasonChips(item)}
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>זריקה אחרונה: {formatDate(item.lastDiscarded)}</Typography>
            </Paper>
          ))}
        </Box>
      )}

      {/* Report table (tablet/desktop) */}
      {!isPhone && (
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
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
                  key={`${item.productName}|${item.type}`}
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
      )}

      {filteredData.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            אין נתונים להצגה
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery
              ? 'לא נמצאו מוצרים התואמים לחיפוש'
              : dateFilterActive || reason
                ? 'לא נמצאו זריקות התואמות לסינון שנבחר'
                : 'עדיין לא בוצעו זריקות במערכת'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DiscardReport;