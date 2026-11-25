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
  Button,
  Tab,
  Tabs,
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
          <Typography component="h1" sx={{ mb: 1, color: 'error.main', fontWeight: 700, fontSize: '1.375rem' }}>
            גישה נדחתה
          </Typography>
          <Typography sx={{ mb: 3, color: 'text.secondary' }}>אין לך הרשאות להגיע לעמוד זה.</Typography>
          <Stack spacing={1.5} direction="row" justifyContent="center">
            <Button variant="contained" onClick={() => navigate('/dashboard')}>
              חזרה לדף הבית
            </Button>
            <Button variant="outlined" onClick={handleSignOut}>
              התנתק
            </Button>
          </Stack>
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
      
          {/* Main content — V3: flat tabs and sections, no enclosing card (same language as the inventory). */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
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
              scrollButtons={false}
              aria-label="אזורי ניהול"
              sx={{ minHeight: 48, '& .MuiTab-root': { minHeight: 48, fontWeight: 700, fontSize: '0.95rem', px: 2 } }}
            >
              <Tab value="inventory" label="מלאי" icon={<CatalogIcon fontSize="small" />} iconPosition="start" />
              {/* User management is admin-only (see src/app/access.ts); managers never see a dead-end tab. */}
              {isAdmin && (
                <Tab value="users" label="ניהול משתמשים" icon={<UsersIcon fontSize="small" />} iconPosition="start" onClick={handleUsersTab} />
              )}
              <Tab value="products" label="ניהול מוצרים" icon={<ProductsIcon fontSize="small" />} iconPosition="start" />
              <Tab value="reports" label="דוחות זריקות" icon={<ReportsIcon fontSize="small" />} iconPosition="start" />
            </Tabs>
          </Box>

          <Box sx={{ pt: 2 }}>
            {activeTab === 'inventory' && (
              <Box component="section" aria-labelledby="admin-inventory-heading">
                <Typography id="admin-inventory-heading" component="h2" sx={{ fontWeight: 700, fontSize: '1.125rem', mb: 1 }}>
                  מלאי העסק
                </Typography>
                {/* Text-only sub-views (no emoji); each one is a filtered view of the same list. */}
                <Tabs
                  value={inventorySubTab}
                  onChange={(_, newValue) => setInventorySubTab(newValue)}
                  variant="scrollable"
                  scrollButtons={false}
                  aria-label="תצוגת מלאי"
                  sx={{ mb: 1.5, minHeight: 44, '& .MuiTab-root': { minHeight: 44, fontWeight: 700, fontSize: '0.875rem', px: 1.5 } }}
                >
                  <Tab value="active" label="פעילים" />
                  <Tab value="expiring" label="עומדים לפוג" />
                  <Tab value="discarded" label="פג תוקף ונזרקו" />
                  <Tab value="finished" label="נגמרו" />
                </Tabs>

                {inventorySubTab === 'active' && (
                  <ItemsList showActiveOnly refreshTrigger={0} isOffline={isOffline} onItemUpdated={() => {}} />
                )}
                {inventorySubTab === 'expiring' && (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      פריטים שתוקפם מסתיים ב־72 השעות הקרובות.
                    </Typography>
                    <ItemsList showExpiringsSoon refreshTrigger={0} isOffline={isOffline} onItemUpdated={() => {}} />
                  </>
                )}
                {inventorySubTab === 'discarded' && (
                  <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
                    <Box component="section" aria-labelledby="admin-expired-heading">
                      <Typography id="admin-expired-heading" component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>
                        פג תוקף וממתינים לטיפול
                      </Typography>
                      <ItemsList showExpiredOnly refreshTrigger={0} isOffline={isOffline} onItemUpdated={() => {}} />
                    </Box>
                    <Box component="section" aria-labelledby="admin-discarded-heading">
                      <Typography id="admin-discarded-heading" component="h3" sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>
                        פריטים שנזרקו
                      </Typography>
                      <ItemsList showDiscardedOnly refreshTrigger={0} isOffline={isOffline} onItemUpdated={() => {}} />
                    </Box>
                  </Box>
                )}
                {inventorySubTab === 'finished' && (
                  <ItemsList showFinishedOnly refreshTrigger={0} isOffline={isOffline} onItemUpdated={() => {}} />
                )}
              </Box>
            )}

            {activeTab === 'users' && (
              <Alert severity="info">ניהול המשתמשים נמצא בעמוד נפרד; המעבר אליו מתבצע מהלשונית.</Alert>
            )}

            {activeTab === 'products' && (
              <Box component="section" aria-labelledby="admin-products-heading">
                <Typography id="admin-products-heading" component="h2" sx={{ fontWeight: 700, fontSize: '1.125rem', mb: 0.5 }}>
                  ניהול מוצרים
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  רשימת המוצרים וזמני התוקף שלהם.
                </Typography>
                <ProductManagement isOffline={isOffline} />
              </Box>
            )}

            {activeTab === 'reports' && <DiscardReport businessId={profile?.businessId || ''} />}
          </Box>
        </Container>
      )}
    </Box>
  );
};

export default AdminPanel; 