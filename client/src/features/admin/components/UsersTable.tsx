import { useState, useMemo, memo, useCallback } from 'react';
import { Box, Typography, Paper, Collapse, IconButton } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useSettings } from '../../../global/context/SettingsContext';
import { formatDateShort, formatTimeShort, getRelativeTime, isActiveToday, isActiveThisWeek } from '../../../global/helpers';
import type { UserWithLastLogin } from '../types';
import type { LoginActivity, Language } from '../../../global/types';

// ===== UserRow =====
interface UserRowProps {
  user: UserWithLastLogin;
  language: Language;
  isOnline: boolean;
  userActivities: LoginActivity[];
}

const getMethodIcon = (method: string, size = 14) => {
  if (method === 'google') return <GoogleIcon sx={{ fontSize: size, color: '#4285F4' }} />;
  if (method === 'app_open') return <PhoneAndroidIcon sx={{ fontSize: size, color: '#14B8A6' }} />;
  return <EmailIcon sx={{ fontSize: size, color: '#14B8A6' }} />;
};

const UserRow = memo(({ user, language, isOnline, userActivities }: UserRowProps) => {
  const { t } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const isGoogle = user.registrationMethod === 'google';

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // הפעילות האחרונה (התחברות או פתיחת אפליקציה)
  const lastActivity = user.lastAppOpenAt && user.lastLoginAt
    ? (new Date(user.lastAppOpenAt) > new Date(user.lastLoginAt) ? user.lastAppOpenAt : user.lastLoginAt)
    : user.lastAppOpenAt || user.lastLoginAt;

  return (
    <Paper
      sx={{
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      {/* שורה ראשית */}
      <Box
        onClick={toggleExpand}
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          cursor: 'pointer',
          transition: 'background-color 0.15s',
          '&:active': { bgcolor: 'action.hover' }
        }}
      >
        {/* נקודת סטטוס */}
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: isOnline ? '#22C55E' : '#D1D5DB',
            flexShrink: 0,
          }}
        />

        {/* אווטאר */}
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            bgcolor: user.avatarColor || '#14B8A6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 600,
            fontSize: user.avatarEmoji ? 17 : 14,
            flexShrink: 0,
          }}
        >
          {user.avatarEmoji || user.name.charAt(0).toUpperCase()}
        </Box>

        {/* שם + נראה לאחרונה */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 13.5,
              fontWeight: 600,
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {user.name}
          </Typography>
          <Typography sx={{ fontSize: 11, color: isOnline ? '#16A34A' : 'text.secondary' }}>
            {isOnline
              ? t('onlineNow')
              : lastActivity
                ? getRelativeTime(lastActivity, language)
                : t('neverLoggedIn')
            }
          </Typography>
        </Box>

        {/* מספר כניסות */}
        <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14B8A6', lineHeight: 1 }}>
            {user.totalLogins}
          </Typography>
          <Typography sx={{ fontSize: 9, color: 'text.disabled', lineHeight: 1.2 }}>
            {t('logins')}
          </Typography>
        </Box>

        {/* אייקון שיטת רישום */}
        {isGoogle
          ? <GoogleIcon sx={{ fontSize: 16, color: '#4285F4', flexShrink: 0 }} />
          : <EmailIcon sx={{ fontSize: 16, color: '#9CA3AF', flexShrink: 0 }} />
        }

        {/* חץ הרחבה */}
        <IconButton size="small" sx={{ p: 0.25 }}>
          {isExpanded ? <ExpandLessIcon sx={{ fontSize: 20 }} /> : <ExpandMoreIcon sx={{ fontSize: 20 }} />}
        </IconButton>
      </Box>

      {/* אזור מורחב */}
      <Collapse in={isExpanded}>
        <Box sx={{
          px: 1.5,
          pb: 1.5,
          pt: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover'
        }}>
          {/* פרטי משתמש */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, mb: 1 }}>
            {/* אימייל */}
            <Box sx={{ gridColumn: '1 / -1', bgcolor: 'background.paper', borderRadius: '8px', p: 1 }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500, mb: 0.25 }}>{t('emailField')}</Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: 'text.primary', wordBreak: 'break-all' }}>
                {user.email}
              </Typography>
            </Box>

            {/* התחברות אחרונה */}
            <Box sx={{ bgcolor: 'background.paper', borderRadius: '8px', p: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <LoginIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 500 }}>
                  {t('lastLogin')}
                </Typography>
              </Box>
              {user.lastLoginAt ? (
                <>
                  <Typography sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isActiveToday(user.lastLoginAt) ? '#10B981' : isActiveThisWeek(user.lastLoginAt) ? '#F59E0B' : 'text.primary'
                  }}>
                    {getRelativeTime(user.lastLoginAt, language)}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                    {formatDateShort(user.lastLoginAt, language)} {formatTimeShort(user.lastLoginAt, language)}
                  </Typography>
                </>
              ) : (
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontStyle: 'italic' }}>
                  {t('neverLoggedIn')}
                </Typography>
              )}
            </Box>

            {/* פתיחת אפליקציה אחרונה */}
            <Box sx={{ bgcolor: 'background.paper', borderRadius: '8px', p: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 500 }}>
                  {t('lastAppOpen')}
                </Typography>
              </Box>
              {user.lastAppOpenAt ? (
                <>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary' }}>
                    {getRelativeTime(user.lastAppOpenAt, language)}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                    {formatDateShort(user.lastAppOpenAt, language)} {formatTimeShort(user.lastAppOpenAt, language)}
                  </Typography>
                </>
              ) : (
                <Typography sx={{ fontSize: 11, color: 'text.disabled', fontStyle: 'italic' }}>
                  {t('neverOpened')}
                </Typography>
              )}
            </Box>

            {/* תאריך הרשמה */}
            <Box sx={{ gridColumn: '1 / -1', bgcolor: 'background.paper', borderRadius: '8px', p: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                <CalendarTodayIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 500 }}>
                  {t('registeredAt')}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.primary' }}>
                {formatDateShort(user.createdAt, language)} · {isGoogle ? t('methodGoogle') : t('methodEmail')}
              </Typography>
            </Box>
          </Box>

          {/* ציר זמן פעילות */}
          {userActivities.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('recentActivity')}
              </Typography>
              <Box sx={{ bgcolor: 'background.paper', borderRadius: '8px', overflow: 'hidden' }}>
                {userActivities.slice(0, 10).map((activity, i) => (
                  <Box
                    key={activity.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1,
                      py: 0.5,
                      borderBottom: i < Math.min(userActivities.length, 10) - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', minWidth: 70, fontFamily: 'monospace' }}>
                      {formatDateShort(activity.timestamp, language)}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', minWidth: 38, fontFamily: 'monospace' }}>
                      {formatTimeShort(activity.timestamp, language)}
                    </Typography>
                    {getMethodIcon(activity.loginMethod, 12)}
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {activity.loginMethod === 'app_open' ? t('methodApp') : activity.loginMethod === 'google' ? t('methodGoogle') : t('methodEmail')}
                    </Typography>
                  </Box>
                ))}
              </Box>
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
  activities: LoginActivity[];
  language: Language;
  onlineUserIds: Set<string>;
}

export const UsersTable = ({ users, activities, language, onlineUserIds }: UsersTableProps) => {
  const { t } = useSettings();

  // מיון: אונליין קודם, אח"כ לפי פעילות אחרונה
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aOnline = onlineUserIds.has(a.id) ? 1 : 0;
      const bOnline = onlineUserIds.has(b.id) ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      const aTime = a.lastAppOpenAt || a.lastLoginAt || a.createdAt;
      const bTime = b.lastAppOpenAt || b.lastLoginAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [users, onlineUserIds]);

  // מיפוי פעילויות לפי משתמש
  const activitiesByUser = useMemo(() => {
    const map = new Map<string, LoginActivity[]>();
    for (const activity of activities) {
      const list = map.get(activity.userId);
      if (list) list.push(activity);
      else map.set(activity.userId, [activity]);
    }
    return map;
  }, [activities]);

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
      {sortedUsers.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          language={language}
          isOnline={onlineUserIds.has(user.id)}
          userActivities={activitiesByUser.get(user.id) || []}
        />
      ))}
    </Box>
  );
};
