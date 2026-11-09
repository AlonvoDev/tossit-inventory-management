import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,

  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  AdminPanelSettings as AdminIcon,
  People as UsersIcon,
  Logout as LogoutIcon,
  Store as FridgeIcon,
  PersonAdd as PersonAddIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Category as CategoryIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,

} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import tossitFavicon from '../assets/tossit-favicon.png';
import ClockDisplay from './ClockDisplay';

import { addCustomCategory } from '../api/categoriesAPI';
import { canAccessRoute, canManageBusiness, departmentLabel, ROLE_LABELS, toAppRole } from '../app/access';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  onClick: () => void;
  divider?: boolean;
  /** Whether the current role may see this entry; derived from src/app/access.ts. */
  visible: boolean;
}

const UnifiedNavigation: React.FC = () => {
  const { user, profile, role, isOffline, logout } = useAuth();
  const { showError } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // Category Creation Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
      handleMenuClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Category Modal Handlers
  const handleCategoryModalOpen = () => {
    setShowCategoryModal(true);
    setCategoryError(null);
    setCategorySuccess(null);
    setCategoryFormData({
      name: '',
    });
    handleMenuClose();
  };

  const handleCategoryModalClose = () => {
    setShowCategoryModal(false);
    setCategoryError(null);
    setCategorySuccess(null);
  };

  const handleCategoryInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCategoryFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    setCategorySuccess(null);
    
    // Validation
    if (!categoryFormData.name.trim()) {
      setCategoryError('יש להזין שם קטגוריה');
      return;
    }
    
    setCategoryLoading(true);
    
    try {
      await addCustomCategory({
        name: categoryFormData.name.trim(),
        businessId: profile?.businessId || '',
        createdBy: profile?.email,
      });
      setCategorySuccess('הקטגוריה נוצרה בהצלחה!');
      
      // Reset form after 2 seconds and close modal
      setTimeout(() => {
        handleCategoryModalClose();
      }, 2000);
    } catch (error: unknown) {
      console.error('Category creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'שגיאה ביצירת הקטגוריה. נסה שוב.';
      setCategoryError(errorMessage);
      showError('שגיאה ביצירת קטגוריה', errorMessage);
    } finally {
      setCategoryLoading(false);
    }
  };

  const getCurrentPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'לוח הבקרה';
    if (path === '/admin') return 'ניהול מערכת';
    if (path === '/admin/users') return 'ניהול משתמשים';
    if (path === '/admin/fridges') return 'ניהול מקררים';
    if (path === '/reports') return 'דוחות';
    if (path === '/settings') return 'הגדרות';
    return 'TossIt Pro';
  };

  const go = (path: string) => () => {
    navigate(path);
    handleMenuClose();
  };
  const canSeeAdminPanel = canAccessRoute(role, 'admin');
  const isBusinessAdmin = canManageBusiness(role);

  const navigationItems: NavigationItem[] = [
    { id: 'dashboard', label: 'לוח הבקרה', icon: <DashboardIcon />, onClick: go('/dashboard'), visible: canAccessRoute(role, 'dashboard') },
    { id: 'divider1', label: '', icon: <></>, onClick: () => {}, divider: true, visible: canSeeAdminPanel },
    { id: 'admin', label: 'ניהול מערכת', icon: <AdminIcon />, onClick: go('/admin'), visible: canSeeAdminPanel },
    { id: 'users', label: 'ניהול משתמשים', icon: <UsersIcon />, onClick: go('/admin/users'), visible: canAccessRoute(role, 'adminUsers') },
    { id: 'add-user', label: 'הוסף משתמש חדש', icon: <PersonAddIcon />, onClick: go('/admin/users?add=1'), visible: isBusinessAdmin },
    { id: 'fridges', label: 'ניהול מקררים', icon: <FridgeIcon />, onClick: go('/admin/fridges'), visible: canAccessRoute(role, 'adminFridges') },
    { id: 'add-category', label: 'הוסף קטגוריה חדשה', icon: <CategoryIcon />, onClick: handleCategoryModalOpen, visible: isBusinessAdmin },
    { id: 'reports', label: 'דוחות', icon: <ReportsIcon />, onClick: go('/reports'), visible: canAccessRoute(role, 'reports') },
    { id: 'settings', label: 'הגדרות', icon: <SettingsIcon />, onClick: go('/settings'), visible: canAccessRoute(role, 'settings') },
    { id: 'divider3', label: '', icon: <></>, onClick: () => {}, divider: true, visible: true },
    { id: 'logout', label: 'התנתק', icon: <LogoutIcon />, onClick: handleSignOut, visible: true },
  ];

  const filteredNavigationItems = navigationItems.filter(item => item.visible);

  if (!user || !profile) {
    return null;
  }

  return (
    <AppBar 
      position="fixed" 
      elevation={0}
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
        backdropFilter: 'blur(20px)',
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <Toolbar sx={{ px: { xs: 1, sm: 2, md: 3 }, minHeight: { xs: 56, sm: 64, md: 70 } }}>
        {/* Menu Button */}
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={handleMenuOpen}
          sx={{
            mr: { xs: 1, sm: 2 },
            background: alpha(theme.palette.common.white, 0.1),
            '&:hover': {
              background: alpha(theme.palette.common.white, 0.2),
              transform: 'scale(1.05)',
            },
            transition: 'all 0.2s ease-in-out',
            width: { xs: 40, sm: 48 },
            height: { xs: 40, sm: 48 },
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* App Title and Page */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* TossIt Logo - only show on larger screens */}
                                <Box
                      component="img"
                      src={tossitFavicon}
                      alt="TossIt"
              sx={{ 
                height: { xs: 20, sm: 24, md: 28 },
                width: 'auto',
                display: { xs: 'none', sm: 'block' }
              }}
            />
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700,
                fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.3rem' },
                lineHeight: 1.2,
                fontFamily: 'Inter, Heebo, sans-serif',
              }}
            >
              {getCurrentPageTitle()}
            </Typography>
          </Box>
          <Typography 
            variant="caption" 
            sx={{ 
              opacity: 0.8,
              fontSize: { xs: '0.65rem', sm: '0.75rem' },
              display: { xs: 'none', sm: 'block' },
              fontFamily: 'Inter, Heebo, sans-serif',
            }}
          >
            TossIt Enterprise
          </Typography>
        </Box>

        {/* User Info and Clock - Desktop */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', mr: 2 }}>
          <ClockDisplay />
        </Box>

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Offline Indicator */}
          {isOffline && (
            <Chip 
              label="לא מקוון" 
              size="small" 
              color="warning"
              sx={{ 
                fontWeight: 600,
                display: { xs: 'none', sm: 'flex' }
              }}
            />
          )}


          {/* User Profile */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
            <Avatar 
              sx={{ 
                width: { xs: 32, sm: 36 }, 
                height: { xs: 32, sm: 36 },
                background: alpha(theme.palette.common.white, 0.2),
                border: `2px solid ${alpha(theme.palette.common.white, 0.3)}`,
                fontSize: { xs: '0.8rem', sm: '0.9rem' },
                fontWeight: 600,
              }}
            >
              {profile.fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </Avatar>
          </Box>
        </Stack>
      </Toolbar>

      {/* Navigation Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 3,
            minWidth: 280,
            maxWidth: 320,
            mt: 1,
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 3, py: 2, background: alpha(theme.palette.primary.main, 0.05) }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
            {profile.fullName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {ROLE_LABELS[toAppRole(profile.role) ?? 'staff']}
          </Typography>
          {departmentLabel(profile.department) && (
            <Chip 
              label={departmentLabel(profile.department)}
              size="small" 
              sx={{ mt: 1, fontSize: '0.7rem' }}
            />
          )}
        </Box>
        
        <Divider />

        {/* Navigation Items */}
        {filteredNavigationItems.map((item) => {
          if (item.divider) {
            return <Divider key={item.id} sx={{ my: 1 }} />;
          }

          return (
            <MenuItem 
              key={item.id} 
              onClick={item.onClick}
              disabled={isOffline && item.id !== 'logout' && item.id !== 'dashboard'}
              sx={{
                py: 1.5,
                px: 3,
                '&:hover': {
                  background: alpha(theme.palette.primary.main, 0.08),
                },
                '&.Mui-disabled': {
                  opacity: 0.5,
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                sx={{
                  '& .MuiTypography-root': {
                    fontWeight: item.id === 'logout' ? 600 : 500,
                    color: item.id === 'logout' ? theme.palette.error.main : 'inherit',
                  }
                }}
              />
            </MenuItem>
          );
        })}
      </Menu>

      {/* Category Creation Modal */}
      <Dialog 
        open={showCategoryModal} 
        onClose={handleCategoryModalClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          m: 0,
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            הוסף קטגוריה חדשה
          </Typography>
          <IconButton 
            onClick={handleCategoryModalClose}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleCategorySubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="שם הקטגוריה"
              value={categoryFormData.name}
              onChange={handleCategoryInputChange('name')}
              required
              disabled={categoryLoading}
              sx={{ mb: 3 }}
              placeholder="לדוגמה: מאפים, משקאות קרים, תבלינים"
            />

            {categoryError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {categoryError}
              </Alert>
            )}

            {categorySuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {categorySuccess}
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={handleCategoryModalClose} 
            disabled={categoryLoading}
            sx={{ mr: 1 }}
          >
            ביטול
          </Button>
          <Button 
            onClick={handleCategorySubmit}
            variant="contained"
            disabled={categoryLoading}
            startIcon={categoryLoading ? <CircularProgress size={16} /> : <AddIcon />}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              }
            }}
          >
            {categoryLoading ? 'יוצר קטגוריה...' : 'צור קטגוריה'}
          </Button>
        </DialogActions>
      </Dialog>

    </AppBar>
  );
};

export default UnifiedNavigation;