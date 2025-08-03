import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Tabs,
  Tab,
  Paper,

  Fade,
  Slide,

} from '@mui/material';
import {
  Palette as PaletteIcon,
  Animation as AnimationIcon,
  ViewModule as ViewModuleIcon,
  Timeline as TimelineIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,

} from '@mui/icons-material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import materialTheme, { getGradient } from '../theme/materialTheme';
import PremiumDashboard from './PremiumDashboard';
import {
  AdvancedStatusChip,
  AdvancedProgressCard,
  AdvancedTeamAvatars,
  AdvancedTimeline,
  AdvancedAlert,
} from './AdvancedDataDisplay';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`showcase-tabpanel-${index}`}
      aria-labelledby={`showcase-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MaterialUIShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [alertVisible, setAlertVisible] = useState(true);


  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Sample data for components
  const teamMembers = [
    { id: '1', name: 'John Doe', role: 'Manager', status: 'online' as const },
    { id: '2', name: 'Jane Smith', role: 'Chef', status: 'away' as const },
    { id: '3', name: 'Mike Johnson', role: 'Bartender', status: 'online' as const },
    { id: '4', name: 'Sarah Wilson', role: 'Server', status: 'offline' as const },
    { id: '5', name: 'Alex Brown', role: 'Manager', status: 'online' as const },
  ];

  const timelineEvents = [
    {
      id: '1',
      title: 'New Product Added',
      description: 'Premium whiskey added to bar inventory',
      time: '2 minutes ago',
      type: 'success' as const,
    },
    {
      id: '2',
      title: 'Low Stock Alert',
      description: 'Milk quantity is running low in kitchen',
      time: '15 minutes ago',
      type: 'warning' as const,
    },
    {
      id: '3',
      title: 'Item Expired',
      description: 'Bread expired and needs to be discarded',
      time: '1 hour ago',
      type: 'error' as const,
    },
    {
      id: '4',
      title: 'Shift Started',
      description: 'Evening shift has begun',
      time: '2 hours ago',
      type: 'info' as const,
    },
  ];

  return (
    <ThemeProvider theme={materialTheme}>
      <CssBaseline />
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* Header */}
        <Box
          sx={{
            background: getGradient('primary'),
            color: '#ffffff',
            py: 6,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              opacity: 0.3,
            },
          }}
        >
          <Container maxWidth="xl">
            <Fade in timeout={600}>
              <Stack spacing={2} alignItems="center" textAlign="center" sx={{ position: 'relative', zIndex: 1 }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 700,
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  }}
                >
                  🎨 Material-UI Enterprise Design
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    opacity: 0.9,
                    maxWidth: 600,
                    textShadow: '0 1px 5px rgba(0,0,0,0.2)',
                  }}
                >
                  Sophisticated UI components with premium design patterns
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    size="large"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: '#ffffff',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    Explore Components
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    sx={{
                      color: '#ffffff',
                      borderColor: 'rgba(255,255,255,0.5)',
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        borderColor: '#ffffff',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    View Documentation
                  </Button>
                </Stack>
              </Stack>
            </Fade>
          </Container>
        </Box>

        {/* Alert Banner */}
        {alertVisible && (
          <Slide in={alertVisible} direction="down">
            <Box sx={{ p: 2 }}>
              <Container maxWidth="xl">
                <AdvancedAlert
                  type="info"
                  title="🚀 New Feature Release"
                  message="Advanced Material-UI components are now available with premium design patterns and animations!"
                  dismissible
                  onDismiss={() => setAlertVisible(false)}
                />
              </Container>
            </Box>
          </Slide>
        )}

        {/* Main Content */}
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Navigation Tabs */}
          <Paper
            elevation={0}
            sx={{
              mb: 4,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 72,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                },
                '& .MuiTabs-indicator': {
                  height: 4,
                  borderRadius: '2px 2px 0 0',
                  background: getGradient('primary'),
                },
              }}
            >
              <Tab icon={<ViewModuleIcon />} label="Dashboard Overview" />
              <Tab icon={<PaletteIcon />} label="Color System" />
              <Tab icon={<AssessmentIcon />} label="Data Components" />
              <Tab icon={<TimelineIcon />} label="Timeline & Progress" />
              <Tab icon={<GroupIcon />} label="Team Components" />
              <Tab icon={<AnimationIcon />} label="Animations" />
            </Tabs>
          </Paper>

          {/* Tab Panels */}
          <TabPanel value={activeTab} index={0}>
            <PremiumDashboard>
              <Box sx={{ mt: 4 }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                  Additional Dashboard Content
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <AdvancedProgressCard
                      title="Bar Inventory"
                      current={847}
                      total={1000}
                      color="secondary"
                      subtitle="Current stock levels"
                      trend={{ value: 8.5, isPositive: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <AdvancedProgressCard
                      title="Kitchen Items"
                      current={623}
                      total={800}
                      color="success"
                      subtitle="Fresh ingredients"
                      trend={{ value: 12.3, isPositive: true }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </PremiumDashboard>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
              🎨 Advanced Color System
            </Typography>
            
            <Grid container spacing={3}>
              {/* Status Chips */}
              <Grid size={12}>
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                      Status Indicators
                    </Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                      <AdvancedStatusChip status="success" label="Valid Item" icon />
                      <AdvancedStatusChip status="warning" label="Near Expiry" icon />
                      <AdvancedStatusChip status="error" label="Expired" icon />
                      <AdvancedStatusChip status="info" label="Information" icon />
                      <AdvancedStatusChip status="success" label="Gradient Style" variant="gradient" />
                      <AdvancedStatusChip status="warning" label="Outlined Style" variant="outlined" />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Color Palette */}
              <Grid size={12}>
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                      Color Gradients
                    </Typography>
                    <Grid container spacing={2}>
                      {Object.entries({
                        primary: 'Primary',
                        secondary: 'Secondary',
                        success: 'Success',
                        warning: 'Warning',
                        error: 'Error',
                        info: 'Info',
                      }).map(([key, label]) => (
                        <Grid size={{ xs: 6, sm: 4, md: 2 }} key={key}>
                          <Paper
                            sx={{
                              height: 100,
                              background: getGradient(key as any),
                              borderRadius: 2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontWeight: 600,
                              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            }}
                          >
                            {label}
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
              📊 Advanced Data Components
            </Typography>
            
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <AdvancedProgressCard
                  title="Total Inventory"
                  current={1247}
                  total={1500}
                  color="primary"
                  subtitle="Overall stock status"
                  trend={{ value: 15.2, isPositive: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <AdvancedProgressCard
                  title="Expired Items"
                  current={23}
                  total={1247}
                  color="error"
                  subtitle="Items requiring attention"
                  trend={{ value: 5.1, isPositive: false }}
                />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
              📅 Timeline & Progress Tracking
            </Typography>
            
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 8 }}>
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                      Recent Activity Timeline
                    </Typography>
                    <AdvancedTimeline events={timelineEvents} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, lg: 4 }}>
                <Stack spacing={3}>
                  <AdvancedProgressCard
                    title="Weekly Tasks"
                    current={7}
                    total={10}
                    color="primary"
                    subtitle="Completed this week"
                  />
                  <AdvancedProgressCard
                    title="Quality Score"
                    current={94}
                    total={100}
                    color="success"
                    subtitle="Overall performance"
                  />
                </Stack>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
              👥 Team & Collaboration Components
            </Typography>
            
            <Grid container spacing={3}>
              <Grid size={12}>
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                      Team Avatars with Status
                    </Typography>
                    <Stack spacing={3}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                          Small Size
                        </Typography>
                        <AdvancedTeamAvatars members={teamMembers} size="small" max={6} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                          Medium Size
                        </Typography>
                        <AdvancedTeamAvatars members={teamMembers} size="medium" max={4} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                          Large Size
                        </Typography>
                        <AdvancedTeamAvatars members={teamMembers} size="large" max={3} />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={5}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
              ✨ Animations & Transitions
            </Typography>
            
            <Grid container spacing={3}>
              <Grid size={12}>
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                      Animation Examples
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      All components feature sophisticated animations:
                    </Typography>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      <Typography variant="body2">• Cards with hover lift effects and shadow transitions</Typography>
                      <Typography variant="body2">• Smooth fade-in animations for content loading</Typography>
                      <Typography variant="body2">• Progressive reveal animations for lists and grids</Typography>
                      <Typography variant="body2">• Micro-interactions on buttons and interactive elements</Typography>
                      <Typography variant="body2">• Gradient animations and color transitions</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default MaterialUIShowcase;