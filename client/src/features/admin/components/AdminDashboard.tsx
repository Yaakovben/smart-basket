import { useState, useMemo } from 'react';
import { Box, Typography, Paper, IconButton, Tabs, Tab, Skeleton, TextField, InputAdornment, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';
import { useAuth } from '../../../global/hooks';
import { useAdminDashboard, useOnlineUsers } from '../hooks/admin-hooks';
import { ActivityFilters } from './ActivityFilters';
import { ActivityTable } from './ActivityTable';
import { UsersTable } from './UsersTable';
import { COMMON_STYLES } from '../../../global/constants';

// מדדי Skeleton לטעינה
const SKELETON_INDICES = [1, 2, 3, 4] as const;

// קומפוננטת Skeleton לטעינה
const LoadingSkeleton = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    {SKELETON_INDICES.map((i) => (
      <Paper key={i} sx={{ p: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: '14px' }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={18} />
          </Box>
        </Box>
      </Paper>
    ))}
  </Box>
);

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [activityType, setActivityType] = useState<'all' | 'login' | 'app_open'>('all');
  const [selectedActivityUser, setSelectedActivityUser] = useState('');
  const {
    filteredActivities,
    usersWithLoginInfo,
    stats,
    filters,
    setFilterMode,
    setSelectedDate,
    setSelectedMonth,
    setSelectedHour,
    refreshData,
    loading,
    error
  } = useAdminDashboard();
  const socketOnlineUserIds = useOnlineUsers();

  // המשתמש הנוכחי בהכרח מחובר, תמיד מוסיפים אותו לרשימה
  const onlineUserIds = useMemo(() => {
    if (!user?.id) return socketOnlineUserIds;
    if (socketOnlineUserIds.has(user.id)) return socketOnlineUserIds;
    const merged = new Set(socketOnlineUserIds);
    merged.add(user.id);
    return merged;
  }, [socketOnlineUserIds, user?.id]);

  // שמות משתמשים ייחודיים לסינון
  const uniqueUserNames = useMemo(() => {
    const names = new Set(filteredActivities.map(a => a.userName));
    return Array.from(names).sort();
  }, [filteredActivities]);

  // סינון פעילויות לפי סוג ומשתמש
  const displayedActivities = useMemo(() => {
    let result = filteredActivities;
    if (activityType === 'login') {
      result = result.filter(a => a.loginMethod === 'email' || a.loginMethod === 'google');
    } else if (activityType === 'app_open') {
      result = result.filter(a => a.loginMethod === 'app_open');
    }
    if (selectedActivityUser) {
      result = result.filter(a => a.userName === selectedActivityUser);
    }
    return result;
  }, [filteredActivities, activityType, selectedActivityUser]);

  // משתמשים מסוננים (ממוזכר)
  const filteredUsers = useMemo(() => {
    if (!userSearch) return usersWithLoginInfo;
    const searchLower = userSearch.toLowerCase();
    return usersWithLoginInfo.filter(u =>
      u.name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower)
    );
  }, [usersWithLoginInfo, userSearch]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          background: COMMON_STYLES.gradients.header,
          pt: 'max(env(safe-area-inset-top), 16px)',
          pb: 3,
          px: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={() => navigate('/settings')}
              sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)' }}
            >
              {settings.language === 'he' ? <ArrowForwardIcon /> : <ArrowBackIcon />}
            </IconButton>
            <Typography sx={{ color: 'white', fontSize: 20, fontWeight: 700 }}>
              {t('adminDashboard')}
            </Typography>
          </Box>
          <IconButton
            onClick={refreshData}
            sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)' }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* Stats Cards */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          mb: 1,
        }}>
          {([
            { value: stats.totalUsers, label: t('totalUsers'), color: '#14B8A6' },
            { value: stats.uniqueUsersToday, label: t('uniqueUsersToday'), color: '#0EA5E9' },
            { value: onlineUserIds.size, label: t('onlineNow'), color: '#22C55E' },
            { value: stats.loginsToday, label: t('loginsToday'), color: '#14B8A6' },
            { value: stats.loginsThisMonth, label: t('loginsThisMonth'), color: '#0EA5E9' },
            { value: stats.uniqueUsersThisMonth, label: t('uniqueUsersThisMonth'), color: '#8B5CF6' },
          ]).map((stat, i) => (
            <Paper
              key={i}
              sx={{
                p: 1.25,
                borderRadius: '12px',
                textAlign: 'center',
                bgcolor: 'rgba(255,255,255,0.95)',
              }}
            >
              <Typography sx={{ fontSize: 24, fontWeight: 700, color: stat.color, lineHeight: 1.2 }}>
                {stat.value}
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 500, lineHeight: 1.3, mt: 0.25 }}>
                {stat.label}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2 }}>
        {/* Error State */}
        {error && !loading && (
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 2, mb: 2 }}>
            <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
            <Button
              variant="contained"
              onClick={refreshData}
              sx={{ bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0D9488' } }}
            >
              {t('tryAgain')}
            </Button>
          </Paper>
        )}

        {/* Tabs - Always visible */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            mb: 2,
            '& .MuiTabs-indicator': {
              bgcolor: '#14B8A6',
              height: 3,
              borderRadius: '3px'
            },
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: { xs: 12, sm: 14 },
              textTransform: 'none',
              minWidth: 'auto',
              px: { xs: 1.5, sm: 2 },
              color: 'text.secondary',
              '&.Mui-selected': {
                color: '#14B8A6'
              }
            }
          }}
        >
          <Tab label={loading ? t('loginActivity') : `${t('loginActivity')} (${displayedActivities.length})`} />
          <Tab label={loading ? t('registeredUsers') : `${t('registeredUsers')} (${usersWithLoginInfo.length})`} />
        </Tabs>

        {activeTab === 0 && (
          <>
            {/* Filters */}
            {!loading && (
              <ActivityFilters
                filters={filters}
                onFilterModeChange={setFilterMode}
                onDateChange={setSelectedDate}
                onMonthChange={setSelectedMonth}
                onHourChange={setSelectedHour}
                activityType={activityType}
                onActivityTypeChange={setActivityType}
                userNames={uniqueUserNames}
                selectedUser={selectedActivityUser}
                onUserChange={setSelectedActivityUser}
              />
            )}

            {/* Activity Table or Loading */}
            {loading ? <LoadingSkeleton /> : <ActivityTable activities={displayedActivities} language={settings.language} onlineUserIds={onlineUserIds} />}
          </>
        )}

        {activeTab === 1 && (
          <>
            {/* Search Users */}
            {!loading && (
              <TextField
                fullWidth
                size="small"
                placeholder={t('searchCustomer')}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  )
                }}
              />
            )}

            {/* Users Table or Loading */}
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <UsersTable
                users={filteredUsers}
                language={settings.language}
                onlineUserIds={onlineUserIds}
              />
            )}
          </>
        )}
      </Box>
    </Box>
  );
};
