import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Box,
  Tab,
  Tabs,
  Paper,
  Typography,
  useTheme,
  alpha,

  Chip,
  Stack,
} from '@mui/material';
import {

  LocalBar as BarIcon,
  Kitchen as KitchenIcon,
  DeleteOutline as DiscardedIcon,
} from '@mui/icons-material';
// UnifiedNavigation is already rendered in App.tsx
import ShiftButton from '../components/ShiftButton';
import ItemsList from '../components/ItemsList';
import FloatingActionButton from '../components/FloatingActionButton';
import DashboardKPIs from '../components/DashboardKPIs';
import type { Department } from '../domain/contracts';
import { departmentLabel, operableDepartments, ROLE_LABELS, toAppRole } from '../app/access';
import { startDiscardScheduler, stopDiscardScheduler } from '../services/discardScheduler';
const Dashboard: React.FC = () => {
  const { profile, role, isOffline } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  // Only departments this account may read: admin both, manager/staff their own (C1b rules).
  const departments = useMemo(() => operableDepartments(role, profile?.department), [role, profile?.department]);
  const [activeTab, setActiveTab] = useState<Department | 'discarded'>(departments[0] ?? 'discarded');
  useEffect(() => {
    if (activeTab !== 'discarded' && !departments.includes(activeTab)) setActiveTab(departments[0] ?? 'discarded');
  }, [departments, activeTab]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  
  
  // Start discard scheduler when component mounts
  useEffect(() => {
    if (profile?.businessId) {
      console.log('Starting discard scheduler for business:', profile.businessId);
      startDiscardScheduler(profile.businessId);
      
      return () => {
        console.log('Stopping discard scheduler');
        stopDiscardScheduler();
      };
    }
  }, [profile?.businessId]);
  

  
  const handleItemAdded = () => {
    // Trigger a refresh of the items list
    console.log('handleItemAdded called - refreshing items list');
    setRefreshTrigger(prev => {
      const newValue = prev + 1;
      console.log('refreshTrigger updated from', prev, 'to', newValue);
      return newValue;
    });
  };
  
  const handleItemUpdated = () => {
    // Trigger a refresh of all tabs when an item is updated (e.g., marked as discarded)
    console.log('handleItemUpdated called - refreshing all tabs');
    setRefreshTrigger(prev => {
      const newValue = prev + 1;
      console.log('refreshTrigger updated from', prev, 'to', newValue);
      return newValue;
    });
  };
  
  // If no user profile, show loading or error
  if (!profile) {
    return (
      <div className="loading-container">
        <h2>טוען נתוני משתמש...</h2>
        <p>אם המסך נתקע, יתכן שיש בעיה בחיבור לשרת.</p>
        <button 
          onClick={() => navigate('/login')}
          className="error-button"
        >
          חזרה למסך הכניסה
        </button>
      </div>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
              <Container maxWidth="xl" sx={{ flexGrow: 1, py: { xs: 1, sm: 2, md: 4 }, px: { xs: 1, sm: 2, md: 3 } }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, gap: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700,
                  mb: 1,
                  fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' },
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                שלום, {profile.fullName}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Chip 
                  label={toAppRole(profile.role) ? ROLE_LABELS[toAppRole(profile.role)!] : 'עובד'}
                  color="primary"
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
                {profile.role !== 'admin' && departmentLabel(profile.department) && (
                  <Chip 
                    label={departmentLabel(profile.department)}
                    variant="outlined"
                    size="small"
                  />
                )}
                {isOffline && (
                  <Chip 
                    label="מצב לא מקוון"
                    color="warning"
                    variant="filled"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Stack>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <ShiftButton />
            </Box>
          </Box>
        </Box>
        
        {/* Main Content */}
        <Paper 
          elevation={0}
          sx={{ 
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            overflow: 'hidden',
            background: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Modern Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  minHeight: { xs: 56, sm: 64 },
                  minWidth: { xs: 100, sm: 120 },
                  textTransform: 'none',
                  padding: { xs: '8px 16px', sm: '12px 24px' },
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                  },
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                },
                '& .MuiTabs-scrollButtons': {
                  '&.Mui-disabled': { opacity: 0.3 },
                },
              }}
            >
              {departments.map(d => (
                <Tab
                  key={d}
                  value={d}
                  label={departmentLabel(d)}
                  icon={d === 'bar'
                    ? <BarIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                    : <KitchenIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />}
                  iconPosition="start"
                  sx={{ minWidth: { xs: 100, sm: 120 } }}
                />
              ))}
              <Tab 
                value="discarded" 
                label="פריטים נזרקים" 
                icon={<DiscardedIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />} 
                iconPosition="start"
                sx={{ minWidth: { xs: 140, sm: 160 } }}
              />
            </Tabs>
          </Box>
          
          <Box sx={{ p: 3 }}>
            {activeTab === 'discarded' ? (
              <Box>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '1.3rem', sm: '1.5rem' } }}>
                    פריטים נזרקים
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                    רשימת כל הפריטים שנזרקו במערכת
                  </Typography>
                </Box>
                <ItemsList 
                  showDiscardedOnly={true}
                  refreshTrigger={refreshTrigger}
                  isOffline={isOffline}
                  onItemUpdated={handleItemUpdated}

                />
              </Box>
            ) : (
              <Box>
                {/* Dashboard KPIs */}
                <Box sx={{ mb: 4 }}>
                  <DashboardKPIs />
                </Box>
                
                {/* Enhanced inventory display with grouping */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '1.3rem', sm: '1.5rem' } }}>
                    מלאי {departmentLabel(activeTab)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                    פריטים פעילים מקובצים לפי מקרר ומסומנים לפי סטטוס תוקף
                  </Typography>
                </Box>
                
                <ItemsList 
                  areaFilter={activeTab}
                  refreshTrigger={refreshTrigger}
                  isOffline={isOffline}
                  onItemUpdated={handleItemUpdated}
                />
              </Box>
            )}
          </Box>
        </Paper>

        {/* Floating Action Button for non-discarded tabs */}
        {activeTab !== 'discarded' && (
          <FloatingActionButton
            department={activeTab}
            onItemAdded={handleItemAdded}
            disabled={isOffline}
          />
        )}

      </Container>
    </Box>
  );
};

export default Dashboard; 