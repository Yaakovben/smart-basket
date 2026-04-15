import { useState, useMemo, memo, useCallback } from 'react';
import { Box, Typography, Paper, Collapse, IconButton, keyframes, CircularProgress, Skeleton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useSettings } from '../../../global/context/SettingsContext';
import { formatDateShort, formatTimeShort, getRelativeTime } from '../../../global/helpers';
import { adminApi, type AdminUserList } from '../../../services/api';
import type { UserWithLastLogin } from '../types';
import type { LoginActivity, Language } from '../../../global/types';

// צבעי סוגי אירועים
const EVENT_COLORS = {
  login: '#14B8A6',
  app_open: '#3B82F6',
  registration: '#8B5CF6',
  google: '#4285F4',
} as const;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
`;

// אייקון שיטה בתוך עיגול צבעוני
const MethodBadge = ({ method, size = 28 }: { method: string; size?: number }) => {
  const color = method === 'google' ? EVENT_COLORS.google : method === 'app_open' ? EVENT_COLORS.app_open : EVENT_COLORS.login;
  const iconSize = size * 0.5;
  return (
    <Box sx={{
      width: size,
      height: size,
      borderRadius: '50%',
      bgcolor: `${color}14`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {method === 'google' && <GoogleIcon sx={{ fontSize: iconSize, color }} />}
      {method === 'app_open' && <PhoneAndroidIcon sx={{ fontSize: iconSize, color }} />}
      {method === 'email' && <EmailIcon sx={{ fontSize: iconSize, color }} />}
    </Box>
  );
};

// כרטיס רשימה בודד בפרטים מורחבים
const ListCard = ({ list, isDark }: { list: AdminUserList; isDark: boolean }) => {
  const { t } = useSettings();
  const progress = list.productCount > 0 ? Math.round((list.purchasedCount / list.productCount) * 100) : 0;

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      px: 1.25,
      py: 0.75,
      borderRadius: '10px',
      bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
      border: '1px solid',
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    }}>
      {/* אייקון רשימה */}
      <Box sx={{
        width: 32,
        height: 32,
        borderRadius: '8px',
        bgcolor: list.isGroup ? 'rgba(59,130,246,0.1)' : 'rgba(20,184,166,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {list.isGroup
          ? <GroupIcon sx={{ fontSize: 16, color: '#3B82F6' }} />
          : <ListAltIcon sx={{ fontSize: 16, color: '#14B8A6' }} />
        }
      </Box>

      {/* שם + מידע */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: 12.5,
          fontWeight: 600,
          color: isDark ? '#E5E7EB' : '#374151',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {list.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
          {list.isGroup ? (
            <>
              <Typography sx={{ fontSize: 10, color: '#9CA3AF' }}>
                {list.membersCount} {t('members')}
              </Typography>
              {list.isOwner && (
                <Typography sx={{ fontSize: 9.5, color: '#14B8A6', fontWeight: 600 }}>
                  {t('owner')}
                </Typography>
              )}
            </>
          ) : (
            <Typography sx={{ fontSize: 9.5, color: 'text.secondary' }}>
              {t('privateList')}
            </Typography>
          )}
        </Box>
      </Box>

      {/* מוצרים */}
      <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ShoppingCartIcon sx={{ fontSize: 12, color: '#9CA3AF' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: isDark ? '#D1D5DB' : '#374151' }}>
            {list.productCount}
          </Typography>
        </Box>
        {list.productCount > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mt: 0.25 }}>
            <CheckCircleIcon sx={{ fontSize: 10, color: '#22C55E' }} />
            <Typography sx={{ fontSize: 9.5, color: '#22C55E', fontWeight: 500 }}>
              {progress}%
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ===== UserRow =====
interface UserRowProps {
  user: UserWithLastLogin;
  language: Language;
  isOnline: boolean;
  userActivities: LoginActivity[];
  isDark: boolean;
}

const UserRow = memo(({ user, language, isOnline, userActivities, isDark }: UserRowProps) => {
  const { t, settings } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [userLists, setUserLists] = useState<AdminUserList[] | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const isGoogle = user.registrationMethod === 'google';
  const isRtl = settings.language === 'he';

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // טעינת פרטים מורחבים (רשימות + מוצרים)
  const handleShowDetails = useCallback(async () => {
    if (showDetails) {
      setShowDetails(false);
      return;
    }
    if (userLists) {
      setShowDetails(true);
      return;
    }
    setDetailsLoading(true);
    setShowDetails(true);
    try {
      const data = await adminApi.getUserDetails(user.id);
      setUserLists(data.lists);
    } catch {
      setUserLists([]);
    } finally {
      setDetailsLoading(false);
    }
  }, [showDetails, userLists, user.id]);

  const lastActivity = user.lastAppOpenAt && user.lastLoginAt
    ? (new Date(user.lastAppOpenAt) > new Date(user.lastLoginAt) ? user.lastAppOpenAt : user.lastLoginAt)
    : user.lastAppOpenAt || user.lastLoginAt;

  // סיכום רשימות
  const listsSummary = userLists ? {
    total: userLists.length,
    totalProducts: userLists.reduce((sum, l) => sum + l.productCount, 0),
    groups: userLists.filter(l => l.isGroup).length,
  } : null;

  return (
    <Paper
      sx={{
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: isOnline
          ? (isDark ? '0 2px 8px rgba(34,197,94,0.15)' : '0 2px 8px rgba(34,197,94,0.1)')
          : '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid',
        borderColor: isOnline
          ? (isDark ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.2)')
          : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
        background: isOnline
          ? `linear-gradient(${isRtl ? '270deg' : '90deg'}, rgba(34,197,94,0.05), transparent 60%)`
          : (isDark ? 'rgba(255,255,255,0.03)' : 'white'),
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
          '&:active': { bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }
        }}
      >
        {/* אווטאר עם נקודת אונליין */}
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              bgcolor: user.avatarColor || '#14B8A6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: user.avatarEmoji ? 20 : 16,
              boxShadow: isOnline ? '0 0 0 2.5px rgba(34,197,94,0.3)' : (isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'),
            }}
          >
            {user.avatarEmoji || user.name.charAt(0).toUpperCase()}
          </Box>
          {/* נקודת אונליין על האווטאר */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              [isRtl ? 'left' : 'right']: 0,
              width: 13,
              height: 13,
              borderRadius: '50%',
              bgcolor: isOnline ? '#22C55E' : (isDark ? '#4B5563' : '#D1D5DB'),
              border: `2.5px solid ${isDark ? '#1F2937' : 'white'}`,
              ...(isOnline && { animation: `${pulse} 2.5s ease-in-out infinite` }),
            }}
          />
        </Box>

        {/* שם + נראה לאחרונה */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: isDark ? '#F3F4F6' : '#1F2937',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {user.name}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: isDark ? '#6B7280' : '#9CA3AF' }}>
            {lastActivity
              ? getRelativeTime(lastActivity, language)
              : t('neverLoggedIn')
            }
          </Typography>
        </Box>

        {/* מספר כניסות */}
        <Box sx={{
          bgcolor: 'rgba(20,184,166,0.08)',
          borderRadius: '10px',
          px: 1,
          py: 0.5,
          textAlign: 'center',
          flexShrink: 0,
        }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14B8A6', lineHeight: 1 }}>
            {user.totalLogins}
          </Typography>
          <Typography sx={{ fontSize: 8.5, color: '#6B7280', lineHeight: 1.3, fontWeight: 500 }}>
            {t('logins')}
          </Typography>
        </Box>

        {/* חץ הרחבה */}
        <IconButton size="small" sx={{ p: 0.25 }}>
          <ExpandMoreIcon sx={{
            fontSize: 22,
            color: '#9CA3AF',
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(180deg)' : 'none',
          }} />
        </IconButton>
      </Box>

      {/* אזור מורחב */}
      <Collapse in={isExpanded}>
        <Box sx={{ px: 1.5, pb: 2, pt: 0.5 }}>

          {/* 1. רישום - סגול */}
          <Box sx={{
            mb: 1,
            borderRadius: '12px',
            border: '1px solid rgba(139,92,246,0.15)',
            overflow: 'hidden',
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.25,
              py: 0.75,
              bgcolor: 'rgba(139,92,246,0.06)',
              borderBottom: '1px solid rgba(139,92,246,0.1)',
            }}>
              <PersonAddIcon sx={{ fontSize: 15, color: EVENT_COLORS.registration }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: EVENT_COLORS.registration }}>
                {t('registeredAt')}
              </Typography>
            </Box>
            <Box sx={{ px: 1.25, py: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 500, color: isDark ? '#D1D5DB' : '#374151' }}>
                {formatDateShort(user.createdAt, language)} · {formatTimeShort(user.createdAt, language)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                {isGoogle
                  ? <GoogleIcon sx={{ fontSize: 13, color: EVENT_COLORS.google }} />
                  : <EmailIcon sx={{ fontSize: 13, color: EVENT_COLORS.login }} />
                }
                <Typography sx={{ fontSize: 11, color: '#6B7280' }}>
                  {isGoogle ? t('methodGoogle') : t('methodEmail')}
                </Typography>
                <Typography sx={{ mx: 0.5, color: '#D1D5DB' }}>·</Typography>
                <Typography sx={{ fontSize: 11, color: '#9CA3AF', wordBreak: 'break-all' }}>
                  {user.email}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* 2. פתיחת אפליקציה אחרונה - כחול */}
          <Box sx={{
            mb: 1.5,
            borderRadius: '12px',
            border: '1px solid rgba(59,130,246,0.15)',
            overflow: 'hidden',
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.25,
              py: 0.75,
              bgcolor: 'rgba(59,130,246,0.06)',
              borderBottom: '1px solid rgba(59,130,246,0.1)',
            }}>
              <PhoneAndroidIcon sx={{ fontSize: 15, color: EVENT_COLORS.app_open }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: EVENT_COLORS.app_open }}>
                {t('lastAppOpen')}
              </Typography>
            </Box>
            <Box sx={{ px: 1.25, py: 1 }}>
              {user.lastAppOpenAt ? (
                <>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: isDark ? '#D1D5DB' : '#374151' }}>
                    {getRelativeTime(user.lastAppOpenAt, language)}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: '#9CA3AF', mt: 0.25 }}>
                    {formatDateShort(user.lastAppOpenAt, language)} · {formatTimeShort(user.lastAppOpenAt, language)}
                  </Typography>
                </>
              ) : (
                <Typography sx={{ fontSize: 12, color: '#D1D5DB', fontStyle: 'italic' }}>
                  {t('neverOpened')}
                </Typography>
              )}
            </Box>
          </Box>

          {/* כפתור פרטים נוספים */}
          <Box
            onClick={handleShowDetails}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              py: 0.75,
              borderRadius: '10px',
              cursor: 'pointer',
              bgcolor: showDetails
                ? (isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.06)')
                : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
              border: '1px solid',
              borderColor: showDetails
                ? 'rgba(20,184,166,0.2)'
                : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
              transition: 'all 0.2s',
              '&:active': { transform: 'scale(0.98)' },
              mb: userActivities.length > 0 ? 1.5 : 0,
            }}
          >
            {detailsLoading ? (
              <CircularProgress size={14} sx={{ color: '#14B8A6' }} />
            ) : (
              <InfoOutlinedIcon sx={{ fontSize: 15, color: '#14B8A6' }} />
            )}
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#14B8A6' }}>
              {t('moreDetails')}
            </Typography>
            <ExpandMoreIcon sx={{
              fontSize: 16,
              color: '#14B8A6',
              transition: 'transform 0.2s',
              transform: showDetails ? 'rotate(180deg)' : 'none',
            }} />
          </Box>

          {/* פרטים מורחבים: רשימות + מוצרים */}
          <Collapse in={showDetails}>
            <Box sx={{ mt: 1 }}>
              {detailsLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} variant="rounded" height={48} sx={{ borderRadius: '10px' }} />
                  ))}
                </Box>
              ) : userLists && userLists.length > 0 ? (
                <>
                  {/* סיכום */}
                  {listsSummary && (
                    <Box sx={{
                      display: 'flex',
                      gap: 1.5,
                      mb: 1,
                      px: 0.5,
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ListAltIcon sx={{ fontSize: 13, color: '#14B8A6' }} />
                        <Typography sx={{ fontSize: 11.5, color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: 500 }}>
                          {listsSummary.total} {t('lists')}
                        </Typography>
                      </Box>
                      {listsSummary.groups > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <GroupIcon sx={{ fontSize: 13, color: '#8B5CF6' }} />
                          <Typography sx={{ fontSize: 11.5, color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: 500 }}>
                            {listsSummary.groups} {t('groups')}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ShoppingCartIcon sx={{ fontSize: 13, color: '#3B82F6' }} />
                        <Typography sx={{ fontSize: 11.5, color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: 500 }}>
                          {listsSummary.totalProducts} {t('products')}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  {/* רשימת הרשימות */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {userLists.map(list => (
                      <ListCard key={list.id} list={list} isDark={isDark} />
                    ))}
                  </Box>
                </>
              ) : (
                <Typography sx={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', py: 1, fontStyle: 'italic' }}>
                  {t('noLists')}
                </Typography>
              )}
            </Box>
          </Collapse>

          {/* ציר זמן פעילות */}
          {userActivities.length > 0 && (
            <Box sx={{ mt: showDetails ? 1.5 : 0 }}>
              <Typography sx={{ fontSize: 10.5, color: '#9CA3AF', fontWeight: 600, mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('recentActivity')}
              </Typography>
              <Box sx={{
                position: 'relative',
                [isRtl ? 'pr' : 'pl']: 2.5,
              }}>
                {/* קו ציר זמן */}
                <Box sx={{
                  position: 'absolute',
                  [isRtl ? 'right' : 'left']: 5,
                  top: 6,
                  bottom: 6,
                  width: 2,
                  bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
                  borderRadius: 1,
                }} />
                {userActivities.slice(0, 8).map((activity) => {
                  const dotColor = activity.loginMethod === 'app_open'
                    ? EVENT_COLORS.app_open
                    : activity.loginMethod === 'google'
                      ? EVENT_COLORS.google
                      : EVENT_COLORS.login;
                  return (
                    <Box
                      key={activity.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 0.5,
                        position: 'relative',
                      }}
                    >
                      {/* נקודת ציר זמן */}
                      <Box sx={{
                        position: 'absolute',
                        [isRtl ? 'right' : 'left']: -16,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: dotColor,
                        border: `2px solid ${isDark ? '#1F2937' : 'white'}`,
                        boxShadow: `0 0 0 1px ${dotColor}40`,
                      }} />
                      <Typography sx={{ fontSize: 11, color: '#9CA3AF', minWidth: 38 }}>
                        {formatTimeShort(activity.timestamp, language)}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: '#6B7280', minWidth: 62 }}>
                        {formatDateShort(activity.timestamp, language)}
                      </Typography>
                      <MethodBadge method={activity.loginMethod} size={22} />
                    </Box>
                  );
                })}
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
  isDark: boolean;
}

export const UsersTable = ({ users, activities, language, onlineUserIds, isDark }: UsersTableProps) => {
  const { t } = useSettings();

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
      <Box sx={{ textAlign: 'center', py: 6, color: '#9CA3AF' }}>
        <Typography sx={{ fontSize: 48, mb: 1, opacity: 0.5 }}>👥</Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{t('noActivityFound')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {sortedUsers.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          language={language}
          isOnline={onlineUserIds.has(user.id)}
          userActivities={activitiesByUser.get(user.id) || []}
          isDark={isDark}
        />
      ))}
    </Box>
  );
};
