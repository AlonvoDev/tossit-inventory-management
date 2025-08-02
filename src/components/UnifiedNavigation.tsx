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
  Badge,
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
  FormControl,
  InputLabel,
  Select,

  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  AdminPanelSettings as AdminIcon,
  People as UsersIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Store as FridgeIcon,
  PersonAdd as PersonAddIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Category as CategoryIcon,
  BugReport as BugReportIcon,

} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import ClockDisplay from './ClockDisplay';
import { createUserByAdmin } from '../api/authAPI';

import { addCustomCategory } from '../api/categoriesAPI';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  onClick: () => void;
  badge?: number;
  divider?: boolean;
  adminOnly?: boolean;
  managerOnly?: boolean;
}

const UnifiedNavigation: React.FC = () => {
  const { user, profile, isAdmin, isManager, isOffline, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  
  // User Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff' as 'admin' | 'manager' | 'staff',
    department: 'bar' as 'bar' | 'kitchen',
    phoneNumber: '',
  });



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

  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
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

  const handleRegisterModalOpen = () => {
    setShowRegisterModal(true);
    setRegisterError(null);
    setRegisterSuccess(null);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'staff',
      department: 'bar',
      phoneNumber: '',
    });
    handleMenuClose();
  };

  const handleRegisterModalClose = () => {
    setShowRegisterModal(false);
    setRegisterError(null);
    setRegisterSuccess(null);
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);
    
    // Validation
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setRegisterError('יש למלא את כל השדות הנדרשים');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setRegisterError('הסיסמאות אינן תואמות');
      return;
    }
    
    if (formData.password.length < 6) {
      setRegisterError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    
    if (formData.role === 'staff' && (!formData.department || (formData.department !== 'bar' && formData.department !== 'kitchen'))) {
      setRegisterError('יש לבחור מחלקה עבור עובדי צוות');
      return;
    }
    
    setRegisterLoading(true);
    
    try {
      await createUserByAdmin(formData, profile?.businessId || '');
      setRegisterSuccess('המשתמש נוצר בהצלחה!');
      
      // Reset form after 2 seconds and close modal
      setTimeout(() => {
        handleRegisterModalClose();
      }, 2000);
    } catch (error: any) {
      console.error('Registration error:', error);
      setRegisterError(error.message || 'שגיאה ביצירת המשתמש. נסה שוב.');
    } finally {
      setRegisterLoading(false);
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
    } catch (error: any) {
      console.error('Category creation error:', error);
      setCategoryError(error.message || 'שגיאה ביצירת הקטגוריה. נסה שוב.');
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
    return 'TossIt Pro';
  };

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'לוח הבקרה',
      icon: <DashboardIcon />,
      onClick: () => {
        navigate('/dashboard');
        handleMenuClose();
      },
    },
    {
      id: 'divider1',
      label: '',
      icon: <></>,
      onClick: () => {},
      divider: true,
    },
    {
      id: 'admin',
      label: 'ניהול מערכת',
      icon: <AdminIcon />,
      onClick: () => {
        navigate('/admin');
        handleMenuClose();
      },
      managerOnly: true,
    },
    {
      id: 'users',
      label: 'ניהול משתמשים',
      icon: <UsersIcon />,
      onClick: () => {
        navigate('/admin/users');
        handleMenuClose();
      },
      adminOnly: true,
    },
    {
      id: 'add-user',
      label: 'הוסף משתמש חדש',
      icon: <PersonAddIcon />,
      onClick: handleRegisterModalOpen,
      adminOnly: true,
    },
    {
      id: 'fridges',
      label: 'ניהול מקררים',
      icon: <FridgeIcon />,
      onClick: () => {
        navigate('/admin/fridges');
        handleMenuClose();
      },
      adminOnly: true,
    },

    {
      id: 'add-category',
      label: 'הוסף קטגוריה חדשה',
      icon: <CategoryIcon />,
      onClick: handleCategoryModalOpen,
      adminOnly: true,
    },
    {
      id: 'divider2',
      label: '',
      icon: <></>,
      onClick: () => {},
      divider: true,
      managerOnly: true,
    },
    {
      id: 'settings',
      label: 'הגדרות',
      icon: <SettingsIcon />,
      onClick: () => {
        // TODO: Navigate to settings page
        handleMenuClose();
      },
    },
    {
      id: 'qa-tests',
      label: 'בדיקת איכות',
      icon: <BugReportIcon />,
      onClick: () => {
        navigate('/admin?tab=qa');
        handleMenuClose();
      },
      managerOnly: true,
    },
    {
      id: 'divider3',
      label: '',
      icon: <></>,
      onClick: () => {},
      divider: true,
    },
    {
      id: 'logout',
      label: 'התנתק',
      icon: <LogoutIcon />,
      onClick: handleSignOut,
    },
  ];

  const filteredNavigationItems = navigationItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.managerOnly && !isAdmin && !isManager) return false;
    return true;
  });

  if (!user || !profile) {
    return null;
  }

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
        backdropFilter: 'blur(20px)',
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: { xs: 64, sm: 70 } }}>
        {/* Menu Button */}
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={handleMenuOpen}
          sx={{
            mr: 2,
            background: alpha(theme.palette.common.white, 0.1),
            '&:hover': {
              background: alpha(theme.palette.common.white, 0.2),
              transform: 'scale(1.05)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* App Title and Page */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '1.1rem', sm: '1.3rem' },
              lineHeight: 1.2,
            }}
          >
            {getCurrentPageTitle()}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              opacity: 0.8,
              fontSize: '0.75rem',
              display: { xs: 'none', sm: 'block' }
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

          {/* Notifications */}
          <IconButton 
            color="inherit"
            onClick={handleNotificationOpen}
            sx={{
              background: alpha(theme.palette.common.white, 0.1),
              '&:hover': {
                background: alpha(theme.palette.common.white, 0.2),
              },
            }}
          >
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* User Profile */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
            <Avatar 
              sx={{ 
                width: 36, 
                height: 36,
                background: alpha(theme.palette.common.white, 0.2),
                border: `2px solid ${alpha(theme.palette.common.white, 0.3)}`,
                fontSize: '0.9rem',
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
            {profile.role === 'admin' ? 'מנהל מערכת' : 
             profile.role === 'manager' ? 'מנהל מחלקה' : 
             'עובד'}
          </Typography>
          {profile.department && (
            <Chip 
              label={profile.department} 
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
              {item.badge && (
                <Badge badgeContent={item.badge} color="primary" />
              )}
            </MenuItem>
          );
        })}
      </Menu>

      {/* User Registration Modal */}
      <Dialog 
        open={showRegisterModal} 
        onClose={handleRegisterModalClose}
        maxWidth="md"
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
            הוסף משתמש חדש
          </Typography>
          <IconButton 
            onClick={handleRegisterModalClose}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleRegisterSubmit} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
              <TextField
                fullWidth
                label="שם מלא"
                value={formData.fullName}
                onChange={handleInputChange('fullName')}
                required
                disabled={registerLoading}
                sx={{ flex: 1 }}
              />
              <TextField
                fullWidth
                label="אימייל"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                required
                disabled={registerLoading}
                sx={{ flex: 1 }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
              <TextField
                fullWidth
                label="סיסמה"
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
                required
                disabled={registerLoading}
                sx={{ flex: 1 }}
              />
              <TextField
                fullWidth
                label="אימות סיסמה"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                required
                disabled={registerLoading}
                sx={{ flex: 1 }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
              <FormControl fullWidth sx={{ flex: 1 }}>
                <InputLabel>תפקיד</InputLabel>
                <Select
                  value={formData.role}
                  label="תפקיד"
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                  disabled={registerLoading}
                >
                  <MenuItem value="staff">עובד</MenuItem>
                  <MenuItem value="manager">מנהל מחלקה</MenuItem>
                  <MenuItem value="admin">מנהל מערכת</MenuItem>
                </Select>
              </FormControl>

              {formData.role === 'staff' && (
                <FormControl fullWidth sx={{ flex: 1 }}>
                  <InputLabel>מחלקה</InputLabel>
                  <Select
                    value={formData.department}
                    label="מחלקה"
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value as any }))}
                    disabled={registerLoading}
                  >
                    <MenuItem value="bar">בר</MenuItem>
                    <MenuItem value="kitchen">מטבח</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>

            <TextField
              fullWidth
              label="מספר טלפון (אופציונלי)"
              value={formData.phoneNumber}
              onChange={handleInputChange('phoneNumber')}
              disabled={registerLoading}
              sx={{ mb: 3 }}
            />

            {registerError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {registerError}
              </Alert>
            )}

            {registerSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {registerSuccess}
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={handleRegisterModalClose} 
            disabled={registerLoading}
            sx={{ mr: 1 }}
          >
            ביטול
          </Button>
          <Button 
            onClick={handleRegisterSubmit}
            variant="contained"
            disabled={registerLoading}
            startIcon={registerLoading ? <CircularProgress size={16} /> : <PersonAddIcon />}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              }
            }}
          >
            {registerLoading ? 'יוצר משתמש...' : 'צור משתמש'}
          </Button>
        </DialogActions>
      </Dialog>



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

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 3,
            minWidth: 300,
            mt: 1,
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            התראות
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ px: 3, py: 2, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">
            אין התראות חדשות
          </Typography>
        </Box>
      </Menu>
    </AppBar>
  );
};

export default UnifiedNavigation;