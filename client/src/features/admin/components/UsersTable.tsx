import { useState, useMemo, memo, useCallback } from 'react';
import { Box, Typography, Paper, LinearProgress, Chip, Collapse, IconButton, keyframes } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LoginIcon from '@mui/icons-material/Login';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useSettings } from '../../../global/context/SettingsContext';
import { formatDateShort, formatTimeShort, getRelativeTime, isActiveToday, isActiveThisWeek } from '../../../global/helpers';
import type { UserWithLastLogin } from '../types';
import type { Language } from '../../../global/types';

// אנימציית פעימה לנקודה ירוקה
const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.7; }
`;

// ===== UserRow - כל שורה מנהלת את ה-expand שלה =====
interface UserRowProps {
  user: UserWithLastLogin;
  index: number;
  maxLogins: number;
  language: Language;
  isOnline: boolean;
}

const UserRow = memo(({ user, index, maxLogins, language, isOnline }: UserRowProps) => {
  const { t } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const activeToday = isActiveToday(user.lastLoginAt);
  const activeThisWeek = isActiveThisWeek(user.lastLoginAt);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <Paper
      sx={{
        borderRadius: '14px',
        border: isOnline ? '2px solid #22C55E' : '1px solid',
        borderColor: isOnline ? '#22C55E' : activeToday ? 'rgba(20, 184, 166, 0.3)' : 'divider',
        bgcolor: isOnline ? 'rgba(34, 197, 94, 0.08)' : activeToday ? 'rgba(20, 184, 166, 0.03)' : 'background.paper',
        overflow: 'hidden',
        boxShadow: isOnline ? '0 0 12px rgba(34, 197, 94, 0.2)' : undefined,
      }}
    >
      {/* Compact View - Always visible */}
      <Box
        onClick={toggleExpand}
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
            position: 'relative',
            outline: isOnline ? '2.5px solid #22C55E' : 'none',
            outlineOffset: 2
          }}
        >
          {user.avatarEmoji || user.name.charAt(0).toUpperCase()}
          {isOnline && (
            <Box
              sx={{
                position: 'absolute',
                bottom: -3,
                right: -3,
                width: 14,
                height: 14,
                borderRadius: '50%',
                bgcolor: '#22C55E',
                border: '2.5px solid white',
                animation: `${pulse} 2s ease-in-out infinite`
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
              <Chip
                icon={<FiberManualRecordIcon sx={{ fontSize: '10px !important', color: '#22C55E !important' }} />}
                label={t('online')}
                size="small"
                sx={{
                  height: 24,
                  fontSize: 12,
                  fontWeight: 700,
                  bgcolor: '#DCFCE7',
                  color: '#16A34A',
                  border: '1px solid #BBF7D0',
                  '& .MuiChip-label': { px: 0.5 },
                  '& .MuiChip-icon': { ml: 0.5 }
                }}
              />
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
});

UserRow.displayName = 'UserRow';

// ===== UsersTable =====
interface UsersTableProps {
  users: UserWithLastLogin[];
  language: Language;
  onlineUserIds: Set<string>;
}

export const UsersTable = ({ users, language, onlineUserIds }: UsersTableProps) => {
  const { t } = useSettings();
  const maxLogins = Math.max(...users.map(u => u.totalLogins), 1);

  // הפרדה: מחוברים ולא מחוברים
  const { onlineUsers, offlineUsers } = useMemo(() => {
    const online: UserWithLastLogin[] = [];
    const offline: UserWithLastLogin[] = [];
    users.forEach(u => {
      if (onlineUserIds.has(u.id)) online.push(u);
      else offline.push(u);
    });
    return { onlineUsers: online, offlineUsers: offline };
  }, [users, onlineUserIds]);

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
      {/* כותרת מחוברים עכשיו */}
      {onlineUsers.length > 0 && (
        <>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 0.5,
            py: 0.75
          }}>
            <FiberManualRecordIcon sx={{ fontSize: 12, color: '#22C55E' }} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>
              {t('onlineNow')} ({onlineUsers.length})
            </Typography>
          </Box>
          {onlineUsers.map((user, index) => (
            <UserRow
              key={user.id}
              user={user}
              index={index}
              maxLogins={maxLogins}
              language={language}
              isOnline
            />
          ))}
        </>
      )}

      {/* מפריד בין מחוברים ללא מחוברים */}
      {onlineUsers.length > 0 && offlineUsers.length > 0 && (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 0.5,
          py: 1
        }}>
          <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
          <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {t('registeredUsers')} ({offlineUsers.length})
          </Typography>
          <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
        </Box>
      )}

      {/* משתמשים לא מחוברים */}
      {offlineUsers.map((user, index) => (
        <UserRow
          key={user.id}
          user={user}
          index={onlineUsers.length + index}
          maxLogins={maxLogins}
          language={language}
          isOnline={false}
        />
      ))}
    </Box>
  );
};
