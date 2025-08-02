import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ItemsList from '../components/ItemsList';
import ProductManagement from '../components/ProductManagement';
import QATestSuite from '../components/QATestSuite';
import DiscardReport from '../components/DiscardReport';
import UnifiedNavigation from '../components/UnifiedNavigation';
import {
  Alert,
  Button,
  CircularProgress,
  Container,
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Tab,
  Tabs,
  useTheme,
  alpha,
  Chip,
  Stack,
} from '@mui/material';
import {
  WifiOff as WifiOffIcon,
  People as UsersIcon,
  Inventory as ProductsIcon,
  BugReport as QAIcon,
  Category as CatalogIcon,
  Assessment as ReportsIcon,
} from '@mui/icons-material';

const AdminPanel: React.FC = () => {
  const { user, profile, isAdmin, isManager, loading: isLoading, isOffline, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'inventory' | 'reports' | 'qa'>('inventory');
  const [inventorySubTab, setInventorySubTab] = useState<'active' | 'expiring' | 'discarded' | 'finished'>('active');
  const [networkError, setNetworkError] = useState<string | null>(null);
  
  // Handle URL parameters for direct tab access
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && ['users', 'products', 'inventory', 'reports', 'qa'].includes(tabParam)) {
      setActiveTab(tabParam as 'users' | 'products' | 'inventory' | 'reports' | 'qa');
    }
  }, [location.search]);
  
  // Check if user can access admin panel (admin or manager)
  const canAccessAdminPanel = isAdmin || isManager;
  
  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  useEffect(() => {
    // Redirect non-admin users
    if (!isLoading && !canAccessAdminPanel) {
      console.log('User is not an admin or manager, redirecting to not-authorized');
      navigate('/not-authorized');
    }
  }, [canAccessAdminPanel, isLoading, navigate]);
  
  // Check for admin access and permissions on mount
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!canAccessAdminPanel) return;
      
      // Check if we can access the Firestore database
      try {
        // Just log this for debugging
        console.log('User has admin access:', canAccessAdminPanel);
        console.log('Offline mode:', isOffline);
      } catch (error) {
        console.error('Error checking admin access:', error);
        setNetworkError('יש בעיה בגישה למסד הנתונים. ייתכן שהחיבור לשרת נכשל.');
      }
    };
    
    checkAdminAccess();
  }, [canAccessAdminPanel, isOffline]);

  // Handle users tab navigation
  const handleUsersTab = () => {
    navigate('/admin/users');
  };
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <UnifiedNavigation />
      
      {/* Access denied overlay for non-admins */}
      {!isLoading && !canAccessAdminPanel && (
        <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
          <Card sx={{ p: 4 }}>
            <CardContent>
              <Typography variant="h4" sx={{ mb: 2, color: 'error.main', fontWeight: 600 }}>
                גישה נדחתה
              </Typography>
              <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
                אין לך הרשאות להגיע לעמוד זה.
              </Typography>
              <Stack spacing={2} direction="row" justifyContent="center">
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className="admin-button primary"
                >
                  חזרה לדף הבית
              </button>
                <button 
                  onClick={handleSignOut}
                  className="admin-button secondary"
                >
                התנתק
              </button>
                
                <style>{`
                  .admin-button {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background-color 0.2s;
                  }
                  .admin-button.primary {
                    background-color: ${theme.palette.primary.main};
                    color: white;
                  }
                  .admin-button.primary:hover {
                    background-color: ${theme.palette.primary.dark};
                  }
                  .admin-button.secondary {
                    background-color: ${theme.palette.grey[300]};
                    color: ${theme.palette.text.primary};
                  }
                  .admin-button.secondary:hover {
                    background-color: ${theme.palette.grey[400]};
                  }
                `}</style>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      )}

      {/* Loading state */}
      {isLoading && (
        <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress size={50} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            טוען...
          </Typography>
        </Container>
      )}

      {canAccessAdminPanel && !isLoading && (
        <Container maxWidth="xl" sx={{ flexGrow: 1, py: { xs: 2, sm: 4 } }}>
          {/* Page Header */}
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                mb: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              פאנל ניהול מתקדם
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Chip 
                label={profile?.role === 'admin' ? 'מנהל מערכת' : 'מנהל מחלקה'} 
                color="primary"
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
              {isOffline && (
                <Chip 
                  label="מצב לא מקוון"
                  color="warning"
                  variant="filled"
                  size="small"
                  icon={<WifiOffIcon />}
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Stack>
          </Box>

          {/* Network error alert */}
      {networkError && (
        <Alert 
          severity="error" 
              sx={{ mb: 3, borderRadius: 2 }}
        >
          {networkError}
        </Alert>
      )}
      
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
                onChange={(_, newValue) => {
                  setActiveTab(newValue);
                  // Update URL to reflect active tab
                  const newSearchParams = new URLSearchParams(location.search);
                  newSearchParams.set('tab', newValue);
                  navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
                }}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    minHeight: 64,
                    textTransform: 'none',
                    minWidth: 140,
                    '&.Mui-selected': {
                      color: theme.palette.primary.main,
                    },
                  },
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  },
                }}
              >
                <Tab 
                  value="inventory" 
                  label="מלאי מוצרים" 
                  icon={<CatalogIcon />} 
                  iconPosition="start"
                />
                <Tab 
                  value="users" 
                  label="ניהול משתמשים" 
                  icon={<UsersIcon />} 
                  iconPosition="start"
                  onClick={handleUsersTab}
                />
                <Tab 
                  value="products" 
                  label="ניהול מוצרים" 
                  icon={<ProductsIcon />} 
                  iconPosition="start"
                />
                <Tab 
                  value="reports" 
                  label="דוחות זריקות" 
                  icon={<ReportsIcon />} 
                  iconPosition="start"
                />

                {(isAdmin || isManager) && (
                  <>
                    <Tab 
                      value="qa" 
                      label="בדיקת איכות" 
                      icon={<QAIcon />} 
                      iconPosition="start"
                    />

                  </>
                )}
              </Tabs>
            </Box>
            
            <Box sx={{ p: 3 }}>
              {activeTab === 'inventory' && (
                <Box>
                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                      מלאי מוצרים
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      מעקב מלא אחר מצב המלאי בכל הקטגוריות.
                    </Typography>
                  </Box>
                  
                  {/* Sub-navigation for inventory */}
                  <Box sx={{ mb: 3 }}>
                    <Tabs 
                      value={inventorySubTab} 
                      onChange={(_, newValue) => setInventorySubTab(newValue)}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': {
                          fontWeight: 500,
                          fontSize: '0.85rem',
                          minHeight: 48,
                          textTransform: 'none',
                        },
                      }}
                    >
                      <Tab value="active" label="🟢 פעיל" />
                      <Tab value="expiring" label="🟡 פג תוקף בקרוב" />
                      <Tab value="discarded" label="🗑️ נזרקו לפח" />
                      <Tab value="finished" label="✅ נגמר" />
                    </Tabs>
                  </Box>

                  {/* Inventory content based on sub-tab */}
                  {inventorySubTab === 'active' && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'success.main' }}>
                        מוצרים פעילים
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        מוצרים תקינים ופעילים במערכת.
                      </Typography>
                      <ItemsList 
                        showActiveOnly={true}
                        refreshTrigger={0}
                        isOffline={isOffline}
                        onItemUpdated={() => {}}
                        showQuantityInput={false}
                        showDiscardReason={true}
                      />
                    </Box>
                  )}

                  {inventorySubTab === 'expiring' && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'warning.main' }}>
                        פג תוקף בקרוב
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        מוצרים שעומדים לפוג בתוך 3 ימים.
                      </Typography>
                      <ItemsList 
                        showExpiringsSoon={true}
                        refreshTrigger={0}
                        isOffline={isOffline}
                        onItemUpdated={() => {}}
                        showQuantityInput={true}
                        showDiscardReason={true}
                      />
                    </Box>
                  )}

                  {inventorySubTab === 'discarded' && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'error.main' }}>
                        נזרקו לפח
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        מוצרים שנזרקו עם פירוט סיבת הזריקה וכמות.
                      </Typography>
                      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                        <Card sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                            מוצרים שפג תוקפם
                          </Typography>
                          <ItemsList 
                            showExpiredOnly={true}
                            refreshTrigger={0}
                            isOffline={isOffline}
                            onItemUpdated={() => {}}
                            showQuantityInput={false}
                          />
                        </Card>
                        <Card sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                            מוצרים שנזרקו ידנית
                          </Typography>
                          <ItemsList 
                            showDiscardedOnly={true}
                            refreshTrigger={0}
                            isOffline={isOffline}
                            onItemUpdated={() => {}}
                            showQuantityInput={false}
                          />
                        </Card>
                      </Box>
                    </Box>
                  )}

                  {inventorySubTab === 'finished' && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'success.main' }}>
                        מוצרים שנגמרו
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        מוצרים שנוצלו עד התום (לא נזרקו).
                      </Typography>
                      <ItemsList 
                        showFinishedOnly={true}
                        refreshTrigger={0}
                        isOffline={isOffline}
                        onItemUpdated={() => {}}
                        showQuantityInput={false}
                      />
                    </Box>
                  )}
                </Box>
              )}

              {activeTab === 'users' && (
                <Box>
                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                      ניהול משתמשים
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      רק מנהלים יכולים לגשת לעמוד זה.
                    </Typography>
                  </Box>
                  <Alert 
                    severity="info" 
                    sx={{ 
                      borderRadius: 2,
                      background: alpha(theme.palette.primary.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    }}
                  >
                    עמוד זה זמין רק למנהלים מלאים.
                  </Alert>
                </Box>
              )}

              {activeTab === 'products' && (
                <Box>
                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                      ניהול מוצרים
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ניהול רשימת המוצרים והגדרת זמני תוקף.
                    </Typography>
                  </Box>
                  <ProductManagement isOffline={isOffline} />
                </Box>
          )}

          {activeTab === 'reports' && (
                <Box>
                  <DiscardReport />
                </Box>
              )}


          


              {activeTab === 'qa' && (isAdmin || isManager) && (
                <Box>
                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                      🧪 בדיקת איכות
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      בדיקות איכות מתקדמות ומערכות ניהול עבור המערכת.
                    </Typography>
                    <Alert severity="info" sx={{ mb: 3, textAlign: 'right' }}>
                      <Typography variant="body2">
                        🔗 <strong>טיפ:</strong> ניתן לגשת ישירות לטאב זה באמצעות הקישור: <code>/admin?tab=qa</code>
                      </Typography>
                    </Alert>
                  </Box>
                  <QATestSuite />
                </Box>
              )}

              {/* Information for non-admin/manager users */}
              {!isAdmin && !isManager && (
                <Box sx={{ mt: 4 }}>
                  <Alert severity="info" sx={{ textAlign: 'right' }}>
                    <Typography variant="body2">
                      💡 <strong>הערה:</strong> טאב "בדיקת איכות" זמין רק למנהלים ומנהלי מערכת. 
                      לקבלת הרשאות נוספות, פנה למנהל המערכת שלך.
                    </Typography>
                  </Alert>
                </Box>
              )}


            </Box>
          </Paper>

          {/* Debug info - Development only */}
          {window.location.hostname === 'localhost' && (
            <Card sx={{ mt: 4, border: '2px dashed orange', bgcolor: alpha('#ff9800', 0.05) }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#f57c00', mb: 2, fontWeight: 600 }}>
                  🛠️ Debug Information
                </Typography>
                <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'text.secondary' }}>
                  <Typography>User ID: {user?.uid || 'Not logged in'}</Typography>
                  <Typography>Is Admin: {isAdmin ? 'Yes' : 'No'}</Typography>
                  <Typography>Is Manager: {isManager ? 'Yes' : 'No'}</Typography>
                  <Typography>Can Access QA Tab: {(isAdmin || isManager) ? 'Yes' : 'No'}</Typography>
                  <Typography>Current Active Tab: {activeTab}</Typography>
                  <Typography>Role: {profile?.role || 'Unknown'}</Typography>
                  <Typography>Department: {profile?.department || 'Unknown'}</Typography>
                  <Typography>Full Name: {profile?.fullName || 'Unknown'}</Typography>
                  <Typography>Business ID: {profile?.businessId || 'None'}</Typography>
                  <Typography>Offline Mode: {isOffline ? 'Yes' : 'No'}</Typography>
                  <Typography>Connected to Emulator: {localStorage.getItem('useFirebaseEmulators') === 'true' ? 'Yes' : 'No'}</Typography>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setActiveTab('qa');
                      const newSearchParams = new URLSearchParams(location.search);
                      newSearchParams.set('tab', 'qa');
                      navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
                    }}
                    disabled={!(isAdmin || isManager)}
                    sx={{ mr: 1 }}
                  >
                    🧪 בדוק טאב QA
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => window.open('/admin?tab=qa', '_blank')}
                    disabled={!(isAdmin || isManager)}
                  >
                    🔗 פתח QA בטאב חדש
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}
        </Container>
      )}
    </Box>
  );
};

export default AdminPanel; 