import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Badge,
  IconButton,
  Fab,
  AppBar,
  Toolbar,
  Drawer,
  List,

  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Stack,
  Paper,

  Fade,
  Slide,
  Zoom,
  Grow,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Kitchen as KitchenIcon,
  LocalBar as BarIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { getGradient, getShadow } from '../theme/materialTheme';

interface PremiumDashboardProps {
  children?: React.ReactNode;
}

// Premium KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  gradient?: boolean;
}

const PremiumKPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color,
  gradient = false,
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const getColorStyles = () => {
    const baseColor = theme.palette[color].main;
    return {
      backgroundColor: gradient ? 'transparent' : alpha(baseColor, 0.1),
      background: gradient ? getGradient(color) : undefined,
      borderColor: baseColor,
      color: gradient ? '#ffffff' : baseColor,
    };
  };

  const colorStyles = getColorStyles();

  return (
    <Grow in timeout={600}>
      <Card
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          border: '2px solid',
          ...colorStyles,
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isHovered ? getShadow('cardHover') : getShadow('card'),
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: gradient ? 'rgba(255,255,255,0.3)' : getGradient(color),
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: gradient ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 1,
                }}
              >
                {title}
              </Typography>
              
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  color: gradient ? '#ffffff' : 'text.primary',
                  mb: 0.5,
                }}
              >
                {value}
              </Typography>
              
              {subtitle && (
                <Typography
                  variant="caption"
                  sx={{
                    color: gradient ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                    display: 'block',
                  }}
                >
                  {subtitle}
                </Typography>
              )}
              
              {trend && (
                <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
                  <TrendingUpIcon
                    sx={{
                      fontSize: 16,
                      color: trend.isPositive ? 'success.main' : 'error.main',
                      transform: trend.isPositive ? 'none' : 'rotate(180deg)',
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: trend.isPositive ? 'success.main' : 'error.main',
                      fontWeight: 600,
                      ml: 0.5,
                    }}
                  >
                    {trend.isPositive ? '+' : ''}{trend.value}%
                  </Typography>
                </Stack>
              )}
            </Box>
            
            <Avatar
              sx={{
                bgcolor: gradient ? 'rgba(255,255,255,0.2)' : alpha(theme.palette[color].main, 0.2),
                color: gradient ? '#ffffff' : theme.palette[color].main,
                width: 64,
                height: 64,
                backdropFilter: 'blur(10px)',
              }}
            >
              {icon}
            </Avatar>
          </Stack>
        </CardContent>
      </Card>
    </Grow>
  );
};

// Premium Status Card Component
interface StatusCardProps {
  title: string;
  items: Array<{
    id: string;
    name: string;
    status: 'success' | 'warning' | 'error';
    value: string;
    time?: string;
  }>;
}

const PremiumStatusCard: React.FC<StatusCardProps> = ({ title, items }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircleIcon sx={{ fontSize: 16 }} />;
      case 'warning': return <WarningIcon sx={{ fontSize: 16 }} />;
      case 'error': return <ErrorIcon sx={{ fontSize: 16 }} />;
      default: return null;
    }
  };

  return (
    <Fade in timeout={800}>
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            {title}
          </Typography>
          
          <Stack spacing={2}>
            {items.map((item, index) => (
              <Fade in timeout={1000 + index * 200} key={item.id}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: `${getStatusColor(item.status)}.main`,
                      boxShadow: (theme) => `0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={2}>
                      {getStatusIcon(item.status)}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.name}
                        </Typography>
                        {item.time && (
                          <Typography variant="caption" color="text.secondary">
                            {item.time}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                    
                    <Chip
                      label={item.value}
                      color={getStatusColor(item.status) as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>
                </Paper>
              </Fade>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Fade>
  );
};

// Premium Navigation Drawer
interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  active?: boolean;
}

interface PremiumDrawerProps {
  open: boolean;
  onClose: () => void;
  navigationItems: NavigationItem[];
  onNavigate: (id: string) => void;
}

const PremiumDrawer: React.FC<PremiumDrawerProps> = ({
  open,
  onClose,
  navigationItems,
  onNavigate,
}) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 280,
          background: getGradient('primary'),
          color: '#ffffff',
          border: 'none',
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
            TossIt Dashboard
          </Typography>
          <IconButton onClick={onClose} sx={{ color: '#ffffff' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
        
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 2 }} />
        
        <List sx={{ p: 0 }}>
          {navigationItems.map((item, index) => (
            <Slide in timeout={300 + index * 100} direction="left" key={item.id}>
              <ListItemButton
                onClick={() => onNavigate(item.id)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  backgroundColor: item.active ? 'rgba(255,255,255,0.2)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: '#ffffff', minWidth: 40 }}>
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: item.active ? 600 : 400,
                    color: '#ffffff',
                  }}
                />
              </ListItemButton>
            </Slide>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

// Main Premium Dashboard Component
const PremiumDashboard: React.FC<PremiumDashboardProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('dashboard');

  // Sample data
  const kpiData = [
    {
      title: 'Total Items',
      value: '1,247',
      subtitle: 'Active inventory',
      icon: <InventoryIcon />,
      trend: { value: 12.5, isPositive: true },
      color: 'primary' as const,
      gradient: true,
    },
    {
      title: 'Expired Items',
      value: '23',
      subtitle: 'Needs attention',
      icon: <WarningIcon />,
      trend: { value: 5.2, isPositive: false },
      color: 'error' as const,
    },
    {
      title: 'Bar Items',
      value: '847',
      subtitle: 'Bar inventory',
      icon: <BarIcon />,
      trend: { value: 8.1, isPositive: true },
      color: 'secondary' as const,
    },
    {
      title: 'Kitchen Items',
      value: '400',
      subtitle: 'Kitchen inventory',
      icon: <KitchenIcon />,
      trend: { value: 3.7, isPositive: true },
      color: 'success' as const,
      gradient: true,
    },
  ];

  const statusData = [
    {
      title: 'Recent Activity',
      items: [
        { id: '1', name: 'Milk - Fridge 1', status: 'error' as const, value: 'Expired', time: '2 min ago' },
        { id: '2', name: 'Bread - Kitchen', status: 'warning' as const, value: 'Near expiry', time: '15 min ago' },
        { id: '3', name: 'Beer - Bar Main', status: 'success' as const, value: 'Added', time: '1 hour ago' },
        { id: '4', name: 'Cheese - Fridge 2', status: 'warning' as const, value: 'Low stock', time: '2 hours ago' },
      ],
    },
  ];

  const navigationItems: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, active: activeNavItem === 'dashboard' },
    { id: 'inventory', label: 'Inventory', icon: <InventoryIcon />, badge: 23 },
    { id: 'bar', label: 'Bar Management', icon: <BarIcon /> },
    { id: 'kitchen', label: 'Kitchen Management', icon: <KitchenIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  const handleNavigate = (id: string) => {
    setActiveNavItem(id);
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Premium App Bar */}
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            TossIt Enterprise
          </Typography>
          
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton color="inherit">
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            
            <IconButton color="inherit">
              <PersonIcon />
            </IconButton>
            
            <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Fade in timeout={400}>
          <Typography
            variant="h4"
            sx={{
              mb: 4,
              fontWeight: 700,
              background: getGradient('primary'),
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Welcome to Premium Dashboard
          </Typography>
        </Fade>

        {/* KPI Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {kpiData.map((kpi, index) => (
            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={index}>
              <PremiumKPICard {...kpi} />
            </Grid>
          ))}
        </Grid>

        {/* Content Grid */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ height: 400 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Inventory Trends
                </Typography>
                <Box
                  sx={{
                    height: 300,
                    background: getGradient('light'),
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h6" color="text.secondary">
                    Chart Component Placeholder
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, lg: 4 }}>
            <PremiumStatusCard {...statusData[0]} />
          </Grid>
        </Grid>

        {/* Custom Content */}
        {children}
      </Container>

      {/* Floating Action Button */}
      <Zoom in timeout={600}>
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 24,
            left: 24,
            background: getGradient('primary'),
            boxShadow: getShadow('fab'),
            '&:hover': {
              boxShadow: getShadow('fabHover'),
              transform: 'scale(1.1)',
            },
          }}
        >
          <AddIcon />
        </Fab>
      </Zoom>

      {/* Premium Drawer */}
      <PremiumDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigationItems={navigationItems}
        onNavigate={handleNavigate}
      />
    </Box>
  );
};

export default PremiumDashboard;