import { Box, Typography, Paper, LinearProgress, Chip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LoginIcon from '@mui/icons-material/Login';
import { useSettings } from '../../../global/context/SettingsContext';
import type { UserWithLastLogin } from '../types';
import type { Language } from '../../../global/types';

interface UsersTableProps {
  users: UserWithLastLogin[];
  language: Language;
}

export const UsersTable = ({ users, language }: UsersTableProps) => {
  const { t } = useSettings();

  // Find max logins for progress bar scaling
  const maxLogins = Math.max(...users.map(u => u.totalLogins), 1);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const locale = language === 'he' ? 'he-IL' : language === 'ru' ? 'ru-RU' : 'en-US';
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return language === 'he' ? 'עכשיו' : language === 'ru' ? 'сейчас' : 'now';
    if (diffMins < 60) return language === 'he' ? `לפני ${diffMins} דק'` : language === 'ru' ? `${diffMins} мин назад` : `${diffMins}m ago`;
    if (diffHours < 24) return language === 'he' ? `לפני ${diffHours} שע'` : language === 'ru' ? `${diffHours} ч назад` : `${diffHours}h ago`;
    if (diffDays < 7) return language === 'he' ? `לפני ${diffDays} ימים` : language === 'ru' ? `${diffDays} дн назад` : `${diffDays}d ago`;
    return formatDate(timestamp);
  };

  const isActiveToday = (timestamp?: string) => {
    if (!timestamp) return false;
    const today = new Date().toISOString().split('T')[0];
    return timestamp.startsWith(today);
  };

  const isActiveThisWeek = (timestamp?: string) => {
    if (!timestamp) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(timestamp) > weekAgo;
  };

  if (users.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography sx={{ fontSize: 40, mb: 1 }}>👥</Typography>
        <Typography sx={{ fontSize: 15 }}>{t('noActivityFound')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {users.map((user, index) => {
        const activeToday = isActiveToday(user.lastLoginAt);
        const activeThisWeek = isActiveThisWeek(user.lastLoginAt);

        return (
          <Paper
            key={user.id}
            sx={{
              p: 2,
              borderRadius: '16px',
              border: '1px solid',
              borderColor: activeToday ? 'rgba(20, 184, 166, 0.3)' : 'divider',
              bgcolor: activeToday ? 'rgba(20, 184, 166, 0.03)' : 'background.paper',
              transition: 'transform 0.1s, box-shadow 0.1s',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }
            }}
          >
            {/* Top Row - User Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
              {/* Rank Badge */}
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '8px',
                  bgcolor: index < 3 ? '#F59E0B' : 'action.selected',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: index < 3 ? 'white' : 'text.secondary',
                  fontWeight: 700,
                  fontSize: 12,
                  flexShrink: 0
                }}
              >
                {index + 1}
              </Box>

              {/* Avatar */}
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  bgcolor: user.avatarColor || '#14B8A6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: user.avatarEmoji ? 22 : 18,
                  flexShrink: 0,
                  position: 'relative'
                }}
              >
                {user.avatarEmoji || user.name.charAt(0).toUpperCase()}
                {activeToday && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      bgcolor: '#10B981',
                      border: '2px solid white'
                    }}
                  />
                )}
              </Box>

              {/* User Info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {user.name}
                  </Typography>
                  {activeToday && (
                    <Chip
                      label={language === 'he' ? 'פעיל' : language === 'ru' ? 'Активен' : 'Active'}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: 10,
                        fontWeight: 600,
                        bgcolor: 'rgba(16, 185, 129, 0.15)',
                        color: '#10B981'
                      }}
                    />
                  )}
                </Box>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {user.email}
                </Typography>
              </Box>

              {/* Login Method */}
              {user.lastLoginMethod && (
                <Chip
                  label={user.lastLoginMethod === 'google' ? 'Google' : 'Email'}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: 10,
                    fontWeight: 600,
                    bgcolor: user.lastLoginMethod === 'google' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(20, 184, 166, 0.15)',
                    color: user.lastLoginMethod === 'google' ? '#4285F4' : '#14B8A6'
                  }}
                />
              )}
            </Box>

            {/* Bottom Row - Stats */}
            <Box sx={{
              display: 'flex',
              gap: 2,
              bgcolor: 'action.hover',
              borderRadius: '12px',
              p: 1.5
            }}>
              {/* Last Login */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <AccessTimeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>
                    {t('lastLogin')}
                  </Typography>
                </Box>
                {user.lastLoginAt ? (
                  <Box>
                    <Typography sx={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: activeToday ? '#10B981' : activeThisWeek ? '#F59E0B' : 'text.primary'
                    }}>
                      {getRelativeTime(user.lastLoginAt)}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                      {formatDate(user.lastLoginAt)} {formatTime(user.lastLoginAt)}
                    </Typography>
                  </Box>
                ) : (
                  <Typography sx={{ fontSize: 13, color: 'text.disabled', fontStyle: 'italic' }}>
                    {t('neverLoggedIn')}
                  </Typography>
                )}
              </Box>

              {/* Total Logins */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <LoginIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>
                    {language === 'he' ? 'סה״כ כניסות' : language === 'ru' ? 'Всего входов' : 'Total Logins'}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#8B5CF6', mb: 0.5 }}>
                  {user.totalLogins}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(user.totalLogins / maxLogins) * 100}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: 'rgba(139, 92, 246, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#8B5CF6',
                      borderRadius: 2
                    }
                  }}
                />
              </Box>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
};
