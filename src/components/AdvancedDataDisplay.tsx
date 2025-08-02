import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  AvatarGroup,
  Badge,
  IconButton,
  Stack,

  Paper,
  Tooltip,
  LinearProgress,

  Alert,
  AlertTitle,

  // Timeline components moved to separate import

  Fade,
  Slide,
  Grow,

} from '@mui/material';
import {

  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,

} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import { getGradient, getShadow } from '../theme/materialTheme';

// Advanced Status Chip Component
interface StatusChipProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  label: string;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined' | 'gradient';
  icon?: boolean;
}

export const AdvancedStatusChip: React.FC<StatusChipProps> = ({
  status,
  label,
  size = 'medium',
  variant = 'filled',
  icon = false,
}) => {
  const theme = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          color: theme.palette.success.main,
          backgroundColor: alpha(theme.palette.success.main, 0.1),
          icon: <CheckCircleIcon sx={{ fontSize: size === 'small' ? 12 : 16 }} />,
          gradient: getGradient('success'),
        };
      case 'warning':
        return {
          color: theme.palette.warning.main,
          backgroundColor: alpha(theme.palette.warning.main, 0.1),
          icon: <WarningIcon sx={{ fontSize: size === 'small' ? 12 : 16 }} />,
          gradient: getGradient('warning'),
        };
      case 'error':
        return {
          color: theme.palette.error.main,
          backgroundColor: alpha(theme.palette.error.main, 0.1),
          icon: <ErrorIcon sx={{ fontSize: size === 'small' ? 12 : 16 }} />,
          gradient: getGradient('error'),
        };
      case 'info':
        return {
          color: theme.palette.info.main,
          backgroundColor: alpha(theme.palette.info.main, 0.1),
          icon: <InfoIcon sx={{ fontSize: size === 'small' ? 12 : 16 }} />,
          gradient: getGradient('info'),
        };
      default:
        return {
          color: theme.palette.text.secondary,
          backgroundColor: alpha(theme.palette.text.secondary, 0.1),
          icon: <InfoIcon sx={{ fontSize: size === 'small' ? 12 : 16 }} />,
          gradient: getGradient('light'),
        };
    }
  };

  const config = getStatusConfig();

  const getChipStyles = () => {
    if (variant === 'gradient') {
      return {
        background: config.gradient,
        color: '#ffffff',
        border: 'none',
        '& .MuiChip-icon': {
          color: '#ffffff',
        },
      };
    } else if (variant === 'outlined') {
      return {
        backgroundColor: 'transparent',
        color: config.color,
        border: `2px solid ${config.color}`,
        '& .MuiChip-icon': {
          color: config.color,
        },
      };
    } else {
      return {
        backgroundColor: config.backgroundColor,
        color: config.color,
        border: `1px solid ${alpha(config.color, 0.2)}`,
        '& .MuiChip-icon': {
          color: config.color,
        },
      };
    }
  };

  return (
    <Chip
      label={label}
      size={size}
      icon={icon ? config.icon : undefined}
      sx={{
        fontWeight: 600,
        borderRadius: size === 'small' ? 1 : 1.5,
        ...getChipStyles(),
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: getShadow('button'),
        },
      }}
    />
  );
};

// Advanced Progress Card
interface ProgressCardProps {
  title: string;
  current: number;
  total: number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const AdvancedProgressCard: React.FC<ProgressCardProps> = ({
  title,
  current,
  total,
  color = 'primary',
  icon,
  subtitle,
  trend,
}) => {
  const theme = useTheme();
  const percentage = Math.round((current / total) * 100);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Grow in timeout={600}>
      <Card
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: isHovered ? getShadow('cardHover') : getShadow('card'),
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            {icon && (
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette[color].main, 0.1),
                  color: theme.palette[color].main,
                  width: 48,
                  height: 48,
                }}
              >
                {icon}
              </Avatar>
            )}
          </Stack>

          <Box sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette[color].main }}>
                {current}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                / {total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ({percentage}%)
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={percentage}
              color={color}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: alpha(theme.palette[color].main, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: getGradient(color),
                },
              }}
            />
          </Box>

          {trend && (
            <Stack direction="row" alignItems="center" spacing={1}>
              {trend.isPositive ? (
                <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
              ) : (
                <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
              )}
              <Typography
                variant="caption"
                sx={{
                  color: trend.isPositive ? 'success.main' : 'error.main',
                  fontWeight: 600,
                }}
              >
                {trend.isPositive ? '+' : ''}{trend.value}% from last week
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Grow>
  );
};

// Advanced Team Avatar Group
interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
}

interface AdvancedTeamAvatarsProps {
  members: TeamMember[];
  max?: number;
  size?: 'small' | 'medium' | 'large';
}

export const AdvancedTeamAvatars: React.FC<AdvancedTeamAvatarsProps> = ({
  members,
  max = 4,
  size = 'medium',
}) => {
  const theme = useTheme();

  const getAvatarSize = () => {
    switch (size) {
      case 'small': return 32;
      case 'large': return 56;
      default: return 40;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return theme.palette.success.main;
      case 'away': return theme.palette.warning.main;
      default: return theme.palette.grey[400];
    }
  };

  const avatarSize = getAvatarSize();

  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <AvatarGroup max={max} sx={{ '& .MuiAvatar-root': { width: avatarSize, height: avatarSize } }}>
        {members.map((member) => (
          <Tooltip key={member.id} title={`${member.name} - ${member.role}`} arrow>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <Box
                  sx={{
                    width: size === 'small' ? 8 : 12,
                    height: size === 'small' ? 8 : 12,
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(member.status),
                    border: `2px solid ${theme.palette.background.paper}`,
                  }}
                />
              }
            >
              <Avatar
                src={member.avatar}
                sx={{
                  width: avatarSize,
                  height: avatarSize,
                  bgcolor: getGradient('primary'),
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    boxShadow: getShadow('button'),
                  },
                }}
              >
                {member.name.charAt(0)}
              </Avatar>
            </Badge>
          </Tooltip>
        ))}
      </AvatarGroup>
      
      <Typography variant="body2" color="text.secondary">
        {members.length} team members
      </Typography>
    </Stack>
  );
};

// Advanced Timeline Component
interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
}

interface AdvancedTimelineProps {
  events: TimelineEvent[];
}

export const AdvancedTimeline: React.FC<AdvancedTimelineProps> = ({ events }) => {
  const theme = useTheme();

  const getTimelineConfig = (type: string) => {
    switch (type) {
      case 'success':
        return {
          color: theme.palette.success.main,
          icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
        };
      case 'warning':
        return {
          color: theme.palette.warning.main,
          icon: <WarningIcon sx={{ fontSize: 16 }} />,
        };
      case 'error':
        return {
          color: theme.palette.error.main,
          icon: <ErrorIcon sx={{ fontSize: 16 }} />,
        };
      default:
        return {
          color: theme.palette.info.main,
          icon: <InfoIcon sx={{ fontSize: 16 }} />,
        };
    }
  };

  return (
    <Timeline>
      {events.map((event, index) => {
        const config = getTimelineConfig(event.type);
        
        return (
          <Slide in timeout={300 + index * 200} direction="left" key={event.id}>
            <TimelineItem>
              <TimelineSeparator>
                <TimelineDot
                  sx={{
                    bgcolor: config.color,
                    color: '#ffffff',
                    boxShadow: `0 0 0 4px ${alpha(config.color, 0.2)}`,
                  }}
                >
                  {event.icon || config.icon}
                </TimelineDot>
                {index < events.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              
              <TimelineContent sx={{ py: '12px', px: 2 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: config.color,
                      boxShadow: `0 0 0 1px ${alpha(config.color, 0.1)}`,
                    },
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {event.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {event.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {event.time}
                  </Typography>
                </Paper>
              </TimelineContent>
            </TimelineItem>
          </Slide>
        );
      })}
    </Timeline>
  );
};

// Advanced Alert Component
interface AdvancedAlertProps {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const AdvancedAlert: React.FC<AdvancedAlertProps> = ({
  type,
  title,
  message,
  action,
  dismissible = false,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  if (!visible) return null;

  return (
    <Fade in={visible}>
      <Alert
        severity={type}
        variant="filled"
        onClose={dismissible ? handleDismiss : undefined}
        action={
          action && (
            <IconButton
              color="inherit"
              size="small"
              onClick={action.onClick}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.3)',
                },
              }}
            >
              {action.label}
            </IconButton>
          )
        }
        sx={{
          borderRadius: 2,
          boxShadow: getShadow('card'),
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
      >
        <AlertTitle sx={{ fontWeight: 600 }}>{title}</AlertTitle>
        {message}
      </Alert>
    </Fade>
  );
};

// Export all components as a collection
export const AdvancedDataComponents = {
  StatusChip: AdvancedStatusChip,
  ProgressCard: AdvancedProgressCard,
  TeamAvatars: AdvancedTeamAvatars,
  Timeline: AdvancedTimeline,
  Alert: AdvancedAlert,
};