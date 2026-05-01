import { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Paper, Skeleton, TextField, InputAdornment, Button, keyframes } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LoginIcon from '@mui/icons-material/Login';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { DailyFaithManager } from '../../daily-faith';
import { PriceSyncManager } from './PriceSyncManager';
import { DbHealthCard } from './DbHealthCard';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';
import { useAuth } from '../../../global/hooks';
import { isActiveToday, isActiveThisMonth } from '../../../global/helpers';
import { useAdminDashboard, useOnlineUsers } from '../hooks/admin-hooks';
import { UsersTable } from './UsersTable';
import { RecentActivityFeed } from './RecentActivityFeed';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const spin = keyframes`
  0% { transform: rotate(0deg);   }
  100% { transform: rotate(360deg); }
`;

type UserFilter = 'all' | 'online' | 'activeToday' | 'loginsToday' | 'activeThisMonth';

const SKELETON_INDICES = [1, 2, 3, 4] as const;

const LoadingSkeleton = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
    {SKELETON_INDICES.map((i) => (
      <Paper key={i} sx={{ p: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton variant="circular" width={44} height={44} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={22} />
            <Skeleton variant="text" width="40%" height={16} />
          </Box>
        </Box>
      </Paper>
    ))}
  </Box>
);

// סגנון כרטיס סטטיסטיקה ראשי (לחיץ)
const getCardSx = (isSelected: boolean) => ({
  p: 1.5,
  borderRadius: '16px',
  bgcolor: isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
  border: '1px solid',
  borderColor: isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
  transform: isSelected ? 'scale(1.03)' : 'none',
  '&:active': { transform: 'scale(0.97)' },
});

// סגנון כרטיס סטטיסטיקה משני (לחיץ)
const getInfoCardSx = (isSelected: boolean) => ({
  p: 1.5,
  borderRadius: '16px',
  bgcolor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
  border: '1px solid',
  borderColor: isSelected ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
  transform: isSelected ? 'scale(1.03)' : 'none',
  '&:active': { transform: 'scale(0.97)' },
});

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const { user } = useAuth();
  const isDark = settings.theme === 'dark';
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [faithOpen, setFaithOpen] = useState(false);
  const [priceSyncOpen, setPriceSyncOpen] = useState(false);
  const {
    activities,
    usersWithLoginInfo,
    stats,
    refreshData,
    loading,
    error
  } = useAdminDashboard();
  const socketOnlineUserIds = useOnlineUsers();
  const isRtl = settings.language === 'he';

  const onlineUserIds = useMemo(() => {
    if (!user?.id) return socketOnlineUserIds;
    if (socketOnlineUserIds.has(user.id)) return socketOnlineUserIds;
    const merged = new Set(socketOnlineUserIds);
    merged.add(user.id);
    return merged;
  }, [socketOnlineUserIds, user?.id]);

  // לחיצה על כרטיס סטטיסטיקה = מסנן/מבטל סינון
  const handleFilterClick = useCallback((filter: UserFilter) => {
    setUserFilter(prev => prev === filter ? 'all' : filter);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refreshData();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [refreshData]);

  // סינון משתמשים לפי חיפוש + פילטר כרטיס
  const filteredUsers = useMemo(() => {
    let result = usersWithLoginInfo;

    // סינון לפי כרטיס
    if (userFilter === 'online') {
      result = result.filter(u => onlineUserIds.has(u.id));
    } else if (userFilter === 'activeToday' || userFilter === 'loginsToday') {
      result = result.filter(u =>
        isActiveToday(u.lastLoginAt) || isActiveToday(u.lastAppOpenAt)
      );
    } else if (userFilter === 'activeThisMonth') {
      result = result.filter(u =>
        isActiveThisMonth(u.lastLoginAt) || isActiveThisMonth(u.lastAppOpenAt)
      );
    }

    // סינון לפי חיפוש
    if (userSearch) {
      const searchLower = userSearch.toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [usersWithLoginInfo, userSearch, userFilter, onlineUserIds]);

  return (
    <Box sx={{ height: '100dvh', bgcolor: isDark ? '#0F1419' : '#F8FAFB', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', pb: 'calc(24px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <Box
        sx={{
          background: isDark
            ? 'linear-gradient(135deg, #064E3B 0%, #065F46 50%, #047857 100%)'
            : 'linear-gradient(135deg, #0F766E 0%, #14B8A6 50%, #2DD4BF 100%)',
          pt: 'max(env(safe-area-inset-top), 16px)',
          pb: 8,
          px: 2,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* כותרת + רענון */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              onClick={() => navigate('/settings')}
              role="button"
              tabIndex={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                width: 36,
                height: 36,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                '&:active': { transform: 'scale(0.92)' },
              }}
            >
              {isRtl ? <ArrowForwardIcon /> : <ArrowBackIcon />}
            </Box>
            <Typography sx={{ color: 'white', fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
              {t('adminDashboard')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Box
            onClick={() => setFaithOpen(true)}
            role="button"
            tabIndex={0}
            aria-label={t('dailyFaithManagerTitle')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              width: 44,
              height: 44,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              '&:active': { transform: 'scale(0.92)' },
            }}
          >
            <AutoStoriesIcon sx={{ fontSize: 26 }} />
          </Box>
          <Box
            onClick={() => setPriceSyncOpen(true)}
            role="button"
            tabIndex={0}
            aria-label="ניהול מאגר מחירים"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              width: 44,
              height: 44,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              '&:active': { transform: 'scale(0.92)' },
            }}
          >
            <StorefrontIcon sx={{ fontSize: 26 }} />
          </Box>
          <Box
            onClick={handleRefresh}
            role="button"
            tabIndex={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              width: 44,
              height: 44,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              '&:active': { transform: 'scale(0.92)' },
            }}
          >
            <RefreshIcon sx={{
              fontSize: 26,
              animation: isRefreshing ? `${spin} 1s linear infinite` : 'none',
            }} />
          </Box>
          </Box>
        </Box>

        {/* כרטיסי סטטיסטיקה לחיצים */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, position: 'relative', zIndex: 1, mb: 1.25 }}>
          {/* מחוברים עכשיו */}
          <Box sx={getCardSx(userFilter === 'online')} onClick={() => handleFilterClick('online')}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
              <Box sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: '#4ADE80',
                boxShadow: '0 0 8px rgba(74, 222, 128, 0.6)',
                animation: `${pulse} 2s ease-in-out infinite`,
              }} />
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1 }}>
                {onlineUserIds.size}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 500, mt: 0.5 }}>
              {t('onlineNow')}
            </Typography>
          </Box>

          {/* פעילים היום */}
          <Box sx={getCardSx(userFilter === 'activeToday')} onClick={() => handleFilterClick('activeToday')}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <TrendingUpIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1 }}>
                {stats.uniqueUsersToday}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 500, mt: 0.5 }}>
              {t('activeToday')}
            </Typography>
          </Box>

          {/* סה"כ משתמשים */}
          <Box sx={getCardSx(userFilter === 'all')} onClick={() => setUserFilter('all')}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <PeopleIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1 }}>
                {stats.totalUsers}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 500, mt: 0.5 }}>
              {t('totalUsers')}
            </Typography>
          </Box>
        </Box>

        {/* שורה שנייה - מידע נוסף */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, position: 'relative', zIndex: 1 }}>
          <Box sx={getInfoCardSx(userFilter === 'loginsToday')} onClick={() => handleFilterClick('loginsToday')}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <LoginIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'white', lineHeight: 1 }}>
                {stats.loginsToday}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 500, mt: 0.25 }}>
              {t('loginsToday')}
            </Typography>
          </Box>

          <Box sx={getInfoCardSx(userFilter === 'activeThisMonth')} onClick={() => handleFilterClick('activeThisMonth')}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <CalendarMonthIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'white', lineHeight: 1 }}>
                {stats.uniqueUsersThisMonth}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 500, mt: 0.25 }}>
              {t('uniqueUsersThisMonth')}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ px: 2, mt: -4, position: 'relative', zIndex: 2 }}>
        {/* שגיאה */}
        {error && !loading && (
          <Paper sx={{
            p: 3,
            textAlign: 'center',
            bgcolor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
            border: '1px solid',
            borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#FCA5A5',
            borderRadius: 3,
            mb: 2
          }}>
            <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
            <Button
              variant="contained"
              onClick={handleRefresh}
              sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 2 }}
            >
              {t('tryAgain')}
            </Button>
          </Paper>
        )}

        {/* חיפוש */}
        {!loading && (
          <TextField
            fullWidth
            size="small"
            placeholder={t('searchCustomer')}
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: '14px',
                bgcolor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'white',
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
                border: 'none',
                '& fieldset': { border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' },
                '&:hover fieldset': { borderColor: 'primary.main' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1.5 },
              },
              '& .MuiOutlinedInput-input': { color: isDark ? '#E5E7EB' : undefined, '&::placeholder': { color: isDark ? '#6B7280' : undefined, opacity: 1 } },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: isDark ? '#6B7280' : '#9CA3AF' }} />
                </InputAdornment>
              )
            }}
          />
        )}

        {/* טבלת משתמשים */}
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <UsersTable
            users={filteredUsers}
            activities={activities}
            language={settings.language}
            onlineUserIds={onlineUserIds}
            isDark={isDark}
          />
        )}

        {/* כרטיסיית שימוש ב-MongoDB - גודל DB ופירוט קולקציות */}
        {!loading && <DbHealthCard isDark={isDark} />}

        {/* פיד פעילות אחרונה */}
        {!loading && activities.length > 0 && (
          <RecentActivityFeed activities={activities} language={settings.language} isDark={isDark} />
        )}

        {/* ריווח תחתון */}
        <Box sx={{ height: 32 }} />
      </Box>

      {faithOpen && <DailyFaithManager onClose={() => setFaithOpen(false)} />}
      {priceSyncOpen && <PriceSyncManager onClose={() => setPriceSyncOpen(false)} />}
    </Box>
  );
};
