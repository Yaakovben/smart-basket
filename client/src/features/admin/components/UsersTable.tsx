import { useState } from 'react';
import { Box, Typography, Paper, LinearProgress, Chip, Collapse, IconButton } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LoginIcon from '@mui/icons-material/Login';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useSettings } from '../../../global/context/SettingsContext';
import { formatDateShort, formatTimeShort, getRelativeTime, isActiveToday, isActiveThisWeek } from '../../../global/helpers';
import type { UserWithLastLogin } from '../types';
import type { Language } from '../../../global/types';

interface UsersTableProps {
  users: UserWithLastLogin[];
  language: Language;
  onlineUserIds: Set<string>;
}

export const UsersTable = ({ users, language, onlineUserIds }: UsersTableProps) => {
  const { t } = useSettings();
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Find max logins for progress bar scaling
  const maxLogins = Math.max(...users.map(u => u.totalLogins), 1);

  const toggleExpand = (userId: string) => {
    setExpandedUserId(prev => prev === userId ? null : userId);
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {users.map((user, index) => {
        const isOnline = onlineUserIds.has(user.id);
        const activeToday = isActiveToday(user.lastLoginAt);
        const activeThisWeek = isActiveThisWeek(user.lastLoginAt);
        const isExpanded = expandedUserId === user.id;

        return (
          <Paper
            key={user.id}
            sx={{
              borderRadius: '14px',
              border: '1px solid',
              borderColor: isOnline ? 'rgba(34, 197, 94, 0.4)' : activeToday ? 'rgba(20, 184, 166, 0.3)' : 'divider',
              bgcolor: isOnline ? 'rgba(34, 197, 94, 0.04)' : activeToday ? 'rgba(20, 184, 166, 0.03)' : 'background.paper',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Compact View - Always visible */}
            <Box
              onClick={() => toggleExpand(user.id)}
              sx={{
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                '&:active': { bgcolor: 'action.hover' }
              }}
            >
              {/* Rank */}
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '6px',
                  bgcolor: index < 3 ? '#F59E0B' : 'action.selected',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: index < 3 ? 'white' : 'text.secondary',
                  fontWeight: 700,
                  fontSize: 11,
                  flexShrink: 0
                }}
              >
                {index + 1}
              </Box>

              {/* Avatar */}
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: user.avatarColor || '#14B8A6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: user.avatarEmoji ? 18 : 15,
                  flexShrink: 0,
                  position: 'relative'
                }}
              >
                {user.avatarEmoji || user.name.charAt(0).toUpperCase()}
                {isOnline && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -1,
                      right: -1,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: '#22C55E',
                      border: '2px solid white'
                    }}
                  />
                )}
              </Box>

              {/* Name & Stats */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {user.name}
                  </Typography>
                  {isOnline && (
                    <Box sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: '#22C55E',
                      flexShrink: 0
                    }} />
                  )}
                </Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    color: 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <LoginIcon sx={{ fontSize: 12 }} />
                  {user.totalLogins} {t('logins')}
                </Typography>
              </Box>

              {/* Login Method Badge */}
              {user.lastLoginMethod && (
                <Chip
                  label={user.lastLoginMethod === 'google' ? 'G' : '@'}
                  size="small"
                  sx={{
                    width: 24,
                    height: 24,
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: user.lastLoginMethod === 'google' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(20, 184, 166, 0.15)',
                    color: user.lastLoginMethod === 'google' ? '#4285F4' : '#14B8A6',
                    '& .MuiChip-label': { px: 0 }
                  }}
                />
              )}

              {/* Expand Icon */}
              <IconButton size="small" sx={{ p: 0.5 }}>
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            {/* Expanded Details */}
            <Collapse in={isExpanded}>
              <Box sx={{
                px: 1.5,
                pb: 1.5,
                pt: 0.5,
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover'
              }}>
                {/* Email */}
                <Typography
                  sx={{
                    fontSize: 12,
                    color: 'text.secondary',
                    mb: 1.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  📧 {user.email}
                </Typography>

                {/* Stats Grid */}
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  {/* Last Login */}
                  <Box sx={{ flex: 1, bgcolor: 'background.paper', borderRadius: '10px', p: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                      <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 500 }}>
                        {t('lastLogin')}
                      </Typography>
                    </Box>
                    {user.lastLoginAt ? (
                      <>
                        <Typography sx={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: activeToday ? '#10B981' : activeThisWeek ? '#F59E0B' : 'text.primary'
                        }}>
                          {getRelativeTime(user.lastLoginAt, language)}
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                          {formatDateShort(user.lastLoginAt, language)} {formatTimeShort(user.lastLoginAt, language)}
                        </Typography>
                      </>
                    ) : (
                      <Typography sx={{ fontSize: 12, color: 'text.disabled', fontStyle: 'italic' }}>
                        {t('neverLoggedIn')}
                      </Typography>
                    )}
                  </Box>

                  {/* Total Logins */}
                  <Box sx={{ flex: 1, bgcolor: 'background.paper', borderRadius: '10px', p: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <LoginIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                      <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 500 }}>
                        {t('logins')}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#8B5CF6', mb: 0.5 }}>
                      {user.totalLogins}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(user.totalLogins / maxLogins) * 100}
                      sx={{
                        height: 3,
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

                {/* Login Method */}
                {user.lastLoginMethod && (
                  <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {t('loginMethodLabel')}
                    </Typography>
                    <Chip
                      label={user.lastLoginMethod === 'google' ? 'Google' : 'Email'}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 600,
                        bgcolor: user.lastLoginMethod === 'google' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(20, 184, 166, 0.15)',
                        color: user.lastLoginMethod === 'google' ? '#4285F4' : '#14B8A6'
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Collapse>
          </Paper>
        );
      })}
    </Box>
  );
};
