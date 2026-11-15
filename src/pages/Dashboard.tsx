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
import type { Department } from '../domain/contracts';
import { departmentLabel, operableDepartments, ROLE_LABELS, toAppRole } from '../app/access';
import { startDiscardScheduler, stopDiscardScheduler } from '../services/discardScheduler';
const Dashboard: React.FC = () => {
  const { profile, role, isOffline } = useAuth();
  const navigate = useNavigate();
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

  const roleLabel = toAppRole(profile.role) ? ROLE_LABELS[toAppRole(profile.role)!] : 'עובד';
  const ownDepartment = profile.role !== 'admin' ? departmentLabel(profile.department) : null;

  return (
    <Container maxWidth="lg" disableGutters sx={{ py: { xs: 1, sm: 2 }, px: { xs: 0, sm: 1 } }}>
      {/* Compact identity + shift row (was a large greeting banner) */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap',
          mb: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h1" sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' }, overflowWrap: 'anywhere' }}>
            {profile.fullName}
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={roleLabel} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
            {ownDepartment && <Chip label={ownDepartment} size="small" variant="outlined" />}
            {isOffline && <Chip label="אין חיבור" size="small" color="warning" sx={{ fontWeight: 600 }} />}
          </Stack>
        </Box>
        <ShiftButton />
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons={false}
          aria-label="תצוגת מלאי"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: 48,
            '& .MuiTab-root': { minHeight: 48, fontWeight: 600, fontSize: '0.95rem', px: 2 },
          }}
        >
          {departments.map(d => (
            <Tab
              key={d}
              value={d}
              label={departmentLabel(d)}
              icon={d === 'bar' ? <BarIcon fontSize="small" /> : <KitchenIcon fontSize="small" />}
              iconPosition="start"
            />
          ))}
          <Tab value="discarded" label="נזרקו" icon={<DiscardedIcon fontSize="small" />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          {activeTab === 'discarded' ? (
            <>
              <Typography component="h2" sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 1.5 }}>
                פריטים שנזרקו
              </Typography>
              <ItemsList showDiscardedOnly={true} refreshTrigger={refreshTrigger} isOffline={isOffline} onItemUpdated={handleItemUpdated} />
            </>
          ) : (
            <>
              {/* Inventory header: title + primary action, before filters and items */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                <Typography component="h2" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  מלאי {departmentLabel(activeTab)}
                </Typography>
                <FloatingActionButton variant="inline" department={activeTab} onItemAdded={handleItemAdded} />
              </Box>
              <ItemsList areaFilter={activeTab} refreshTrigger={refreshTrigger} isOffline={isOffline} onItemUpdated={handleItemUpdated} />
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default Dashboard; 