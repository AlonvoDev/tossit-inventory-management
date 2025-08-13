import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateUserRoleToAdmin } from '../api/authAPI';
import {
  Container,
  Box,
  Tab,
  Tabs,
  Paper,
  Typography,
  useTheme,
  alpha,

  Card,
  CardContent,
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
import { addSampleProducts } from '../api/productsAPI';
import { startDiscardScheduler, stopDiscardScheduler } from '../services/discardScheduler';
const Dashboard: React.FC = () => {
  const { user, profile, isAdmin, isOffline } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'bar' | 'kitchen' | 'discarded'>('bar');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Debug effect to log user status
  useEffect(() => {
    console.log('User profile:', profile);
    console.log('Is admin:', isAdmin);
    console.log('Role:', profile?.role);
    console.log('Offline mode:', isOffline);
  }, [profile, isAdmin, isOffline]);
  
  // Clear old pending operations on app start (one time)
  useEffect(() => {
    // Clear all localStorage to avoid undefined value issues
    try {
      console.log('Clearing localStorage to prevent undefined value errors...');
      localStorage.removeItem('pendingOperations');
      localStorage.removeItem('cachedItems_bar');
      localStorage.removeItem('cachedItems_kitchen');
      localStorage.removeItem('cachedItems_all');
      console.log('localStorage cleared successfully');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }, []);
  
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
                  label={profile.role === 'admin' ? 'מנהל מערכת' : 
                        profile.role === 'manager' ? 'מנהל מחלקה' : 
                        'עובד'} 
                  color="primary"
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
                {profile.department && (
                  <Chip 
                    label={profile.department}
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
              <Tab 
                value="bar" 
                label="בר" 
                icon={<BarIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />} 
                iconPosition="start"
                sx={{ minWidth: { xs: 100, sm: 120 } }}
              />
              <Tab 
                value="kitchen" 
                label="מטבח" 
                icon={<KitchenIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />} 
                iconPosition="start"
                sx={{ minWidth: { xs: 100, sm: 120 } }}
              />
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
                    מלאי {activeTab === 'bar' ? 'בר' : activeTab === 'kitchen' ? 'מטבח' : activeTab}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                    פריטים פעילים מקובצים לפי מקרר ומסומנים לפי סטטוס תוקף
                  </Typography>
                </Box>
                
                <ItemsList 
                  areaFilter={activeTab === 'bar' ? 'בר' : activeTab === 'kitchen' ? 'מטבח' : activeTab} 
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
            area={activeTab === 'bar' ? 'בר' : activeTab === 'kitchen' ? 'מטבח' : activeTab}
            onItemAdded={handleItemAdded}
            disabled={isOffline}
          />
        )}

        {/* Development utilities - only visible on localhost */}
        {window.location.hostname === 'localhost' && (
          <Card sx={{ mt: 4, border: '2px dashed orange', bgcolor: alpha('#ff9800', 0.05) }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#f57c00', mb: 2, fontWeight: 600 }}>
                🛠️ כלי פיתוח
              </Typography>
              <Stack spacing={2} alignItems="center">
                <button 
                  onClick={async () => {
                    try {
                      await updateUserRoleToAdmin(user?.uid || '');
                      alert('הרשאות מנהל הוגדרו בהצלחה!');
                      window.location.reload();
                    } catch (error) {
                      console.error('Error updating role:', error);
                      alert('אירעה שגיאה בעדכון ההרשאות');
                    }
                  }}
                  className="dev-button"
                >
                  קבע הרשאות מנהל
                </button>
                
                <button 
                  onClick={async () => {
                    try {
                      if (profile?.businessId) {
                        await addSampleProducts(profile.businessId);
                        alert('מוצרי דוגמה נוספו בהצלחה!');
                        window.location.reload();
                      } else {
                        alert('מזהה עסק לא נמצא');
                      }
                    } catch (error) {
                      console.error('Error adding sample products:', error);
                      alert('אירעה שגיאה בהוספת מוצרי דוגמה');
                    }
                  }}
                  className="dev-button"
                >
                  הוסף מוצרי דוגמה
                </button>
                
                <style>{`
                  .dev-button {
                    padding: 12px 24px;
                    background-color: #ff9800;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background-color 0.2s;
                  }
                  .dev-button:hover {
                    background-color: #f57c00;
                  }
                `}</style>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  );
};

export default Dashboard; 