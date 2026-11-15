import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ItemsList from '../components/ItemsList';
import ProductManagement from '../components/ProductManagement';
import { PageHeader } from '../components/layout/PageHeader';
import DiscardReport from '../components/DiscardReport';
// UnifiedNavigation is already rendered in App.tsx
import {
  Alert,
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
  Category as CatalogIcon,
  Assessment as ReportsIcon,
} from '@mui/icons-material';

const AdminPanel: React.FC = () => {
  const { profile, isAdmin, isManager, loading: isLoading, isOffline, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'inventory' | 'reports'>('inventory');
  const [inventorySubTab, setInventorySubTab] = useState<'active' | 'expiring' | 'discarded' | 'finished'>('active');
  const [networkError, setNetworkError] = useState<string | null>(null);
  
  // Handle URL parameters for direct tab access
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && ['users', 'products', 'inventory', 'reports'].includes(tabParam)) {
      setActiveTab(tabParam as 'users' | 'products' | 'inventory' | 'reports');
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
        <Container maxWidth="lg" disableGutters sx={{ flexGrow: 1, py: { xs: 1, sm: 2 } }}>
          {/* Page header (was a large gradient banner) */}
          <PageHeader
            title="ניהול"
            description={profile?.role === 'admin' ? 'מלאי, מוצרים ודוחות של כל העסק' : 'מלאי, מוצרים ודוחות של המחלקה שלך'}
            actions={isOffline ? <Chip label="אין חיבור" color="warning" size="small" icon={<WifiOffIcon />} sx={{ fontWeight: 600 }} /> : undefined}
          />

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
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {/* Modern Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 0, sm: 1 } }}>
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
                aria-label="אזורי ניהול"
                sx={{ minHeight: 48, '& .MuiTab-root': { minHeight: 48, fontWeight: 600, fontSize: '0.95rem', px: 2 } }}
              >
                <Tab 
                  value="inventory" 
                  label="מלאי מוצרים" 
                  icon={<CatalogIcon />} 
                  iconPosition="start"
                />
                {/* User management is admin-only (see src/app/access.ts); managers never see a dead-end tab. */}
                {isAdmin && (
                  <Tab
                    value="users"
                    label="ניהול משתמשים"
                    icon={<UsersIcon />}
                    iconPosition="start"
                    onClick={handleUsersTab}
                  />
                )}
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
              </Tabs>
            </Box>
            
            <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
              {activeTab === 'inventory' && (
                <Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography component="h2" sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 0.5 }}>
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
                      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' } }}>
                        <Card sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                            פג תוקף וממתינים לטיפול
                          </Typography>
                          <ItemsList 
                            showExpiredOnly={true}
                            refreshTrigger={0}
                            isOffline={isOffline}
                            onItemUpdated={() => {}}

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

                      />
                    </Box>
                  )}
                </Box>
              )}

              {activeTab === 'users' && (
                <Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography component="h2" sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 0.5 }}>
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
                  <Box sx={{ mb: 2 }}>
                    <Typography component="h2" sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 0.5 }}>
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
                  <DiscardReport businessId={profile?.businessId || ''} />
                </Box>
              )}


          





            </Box>
          </Paper>

        </Container>
      )}
    </Box>
  );
};

export default AdminPanel; 