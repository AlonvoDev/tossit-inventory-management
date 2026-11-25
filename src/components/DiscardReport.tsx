import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDiscardReport, DiscardReportItem } from '../api/firestoreAPI';
import DateRangePicker from './DateRangePicker';
import { toQueryBounds } from './dateRange';
import { ManagementList, ManagementRow, Tag } from './layout/ManagementList';
import { departmentLabel } from '../app/access';
import { tokens } from '../app/theme';
import type { DiscardReason } from '../domain/contracts';
import {
  Box,
  Typography,
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
  TextField,
  InputAdornment,
  MenuItem,
} from '@mui/material';
import {
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

type SortKey = 'productName' | 'totalQuantity' | 'discardCount' | 'averageQuantity' | 'lastDiscarded';

/** Same keys and labels as the desktop table headers (phone sort control, UI3-R2). */
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'productName', label: 'שם המוצר' },
  { key: 'totalQuantity', label: 'כמות כוללת נזרקת' },
  { key: 'discardCount', label: 'מספר זריקות' },
  { key: 'averageQuantity', label: 'ממוצע לזריקה' },
  { key: 'lastDiscarded', label: 'זריקה אחרונה' },
];
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
  const STRIP_LINE = `1px solid ${tokens.colors.line}`;
  const unitText = (type: DiscardReportItem['type']) => (type === 'kg' ? 'ק״ג' : 'יח׳');
  // Same rounding on every screen size (was toFixed(0/1) on desktop, which showed 1.5 units as "2").
  const qty = (n: number, type: DiscardReportItem['type']) => `${round(n)} ${unitText(type)}`;
  const avg = (item: DiscardReportItem) => `${Math.round(item.averageQuantity * 100) / 100} ${unitText(item.type)}`;
  // Department identity for same-name products, shown once the report data carries it (CLAUDE_REQUESTS V3-1).
  const departmentOf = (item: DiscardReportItem) => departmentLabel((item as DiscardReportItem & { area?: string }).area) ?? null;
  const reasonChips = (item: DiscardReportItem) => (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {item.reasons.expired > 0 && <Chip size="small" label={`פג תוקף: ${item.reasons.expired}`} sx={{ bgcolor: 'var(--tossit-warning-tint, #FDF4EA)', color: 'var(--tossit-text, #151A21)', fontWeight: 600 }} />}
      {item.reasons.damaged > 0 && <Chip size="small" label={`נפגם: ${item.reasons.damaged}`} sx={{ bgcolor: 'var(--tossit-danger-tint, #FDF0EF)', color: 'var(--tossit-text, #151A21)', fontWeight: 600 }} />}
      {item.reasons.other > 0 && <Chip size="small" label={`אחר: ${item.reasons.other}`} sx={{ bgcolor: 'var(--tossit-surface-soft, #F5F6F8)', color: 'var(--tossit-text, #151A21)', fontWeight: 600 }} />}
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

      {/* Summary: plain counts, units never mixed — one flat strip with separators (V3). */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
          my: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'clip',
        }}
      >
        {stats.map((stat, i) => (
          <Box
            key={stat.label}
            sx={{
              px: 1.5,
              py: 1,
              borderInlineStart: { xs: i % 2 ? STRIP_LINE : 0, sm: i ? STRIP_LINE : 0 },
              borderTop: { xs: i > 1 ? STRIP_LINE : 0, sm: 0 },
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              {stat.label}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '1.25rem' }}>{stat.value}</Typography>
          </Box>
        ))}
      </Box>

      {/* UI3-R2: phones have no table headers, so expose the same sort keys/directions here. */}
      {isPhone && reportData.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
          <TextField
            select
            size="small"
            label="מיון לפי"
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            sx={{ flex: 1, minWidth: 0, '& .MuiInputBase-root': { minHeight: 44 } }}
          >
            {SORT_OPTIONS.map(option => (
              <MenuItem key={option.key} value={option.key} sx={{ minHeight: 44 }}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            aria-label={`כיוון מיון: ${sortOrder === 'asc' ? 'עולה' : 'יורד'}`}
            startIcon={sortOrder === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
            sx={{ minHeight: 44, flexShrink: 0 }}
          >
            {sortOrder === 'asc' ? 'עולה' : 'יורד'}
          </Button>
        </Box>
      )}

      {isPhone && filteredData.length > 0 && (
        <ManagementList>
          {filteredData.map(item => (
            <ManagementRow
              key={`${item.productName}|${item.type}`}
              label={item.productName}
              title={item.productName}
              subtitle={
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  נזרק: {qty(item.totalQuantity, item.type)} · {item.discardCount} פעמים
                </Box>
              }
              tags={
                <>
                  <Tag>{item.type === 'kg' ? 'ק״ג' : 'יחידות'}</Tag>
                  {departmentOf(item) && <Tag>{departmentOf(item)}</Tag>}
                  {reasonChips(item)}
                </>
              }
              meta={
                <>
                  ממוצע לזריקה: {avg(item)} · זריקה אחרונה: {formatDate(item.lastDiscarded)}
                </>
              }
            />
          ))}
        </ManagementList>
      )}

      {/* Report table (tablet/desktop) */}
      {!isPhone && (
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'clip' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: tokens.colors.surfaceSoft, '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', fontSize: '0.8125rem' } }}>
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
                <TableRow key={`${item.productName}|${item.type}`} hover sx={{ '&:last-of-type td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Typography component="span" sx={{ fontWeight: 700 }}>
                        {item.productName}
                      </Typography>
                      <Tag>{item.type === 'kg' ? 'ק"ג' : 'יחידות'}</Tag>
                      {departmentOf(item) && <Tag>{departmentOf(item)}</Tag>}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.0625rem' }}>
                      {round(item.totalQuantity)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{item.discardCount}</TableCell>
                  <TableCell align="center">{avg(item)}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>{reasonChips(item)}</Box>
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
      </Box>
      )}

      {filteredData.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography sx={{ fontWeight: 700 }}>
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