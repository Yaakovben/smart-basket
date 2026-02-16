import { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Paper, IconButton, Tabs, Tab, Skeleton, TextField, InputAdornment, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';
import { useAdminDashboard, useOnlineUsers } from '../hooks/admin-hooks';
import { ActivityFilters } from './ActivityFilters';
import { ActivityTable } from './ActivityTable';
import { UsersTable } from './UsersTable';
import { COMMON_STYLES } from '../../../global/constants';
import { socketService } from '../../../services/socket';

// Skeleton indices for loading state
const SKELETON_INDICES = [1, 2, 3, 4] as const;

// Skeleton component for loading state
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
  const [activeTab, setActiveTab] = useState(0);
  const [userSearch, setUserSearch] = useState('');
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
  const onlineUserIds = useOnlineUsers();
  const [forceRefreshSent, setForceRefreshSent] = useState(false);

  const handleForceRefresh = useCallback(() => {
    socketService.emitForceRefresh();
    setForceRefreshSent(true);
    setTimeout(() => setForceRefreshSent(false), 3000);
  }, []);

  // Memoized filtered users to avoid recalculating on every render
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

        {/* Stats Cards - Row 1 */}
        <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1, mb: 1.5 }}>
          <Paper
            sx={{
              flex: '1 0 auto',
              minWidth: 90,
              p: 1.5,
              borderRadius: '14px',
              textAlign: 'center',
              bgcolor: 'background.paper'
            }}
          >
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: '#14B8A6' }}>
              {stats.totalUsers}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>
              {t('totalUsers')}
            </Typography>
          </Paper>

          <Paper
            sx={{
              flex: '1 0 auto',
              minWidth: 90,
              p: 1.5,
              borderRadius: '14px',
              textAlign: 'center',
              bgcolor: 'background.paper'
            }}
          >
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: '#8B5CF6' }}>
              {stats.uniqueUsersToday}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>
              {t('uniqueUsersToday')}
            </Typography>
          </Paper>

          <Paper
            sx={{
              flex: '1 0 auto',
              minWidth: 90,
              p: 1.5,
              borderRadius: '14px',
              textAlign: 'center',
              bgcolor: 'background.paper'
            }}
          >
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: '#EC4899' }}>
              {stats.uniqueUsersThisMonth}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>
              {t('uniqueUsersThisMonth')}
            </Typography>
          </Paper>
        </Box>

        {/* Stats Cards - Row 2 */}
        <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1 }}>
          <Paper
            sx={{
              flex: '1 0 auto',
              minWidth: 90,
              p: 1.5,
              borderRadius: '14px',
              textAlign: 'center',
              bgcolor: 'background.paper'
            }}
          >
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>
              {stats.loginsToday}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>
              {t('loginsToday')}
            </Typography>
          </Paper>

          <Paper
            sx={{
              flex: '1 0 auto',
              minWidth: 90,
              p: 1.5,
              borderRadius: '14px',
              textAlign: 'center',
              bgcolor: 'background.paper'
            }}
          >
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: '#3B82F6' }}>
              {stats.loginsThisMonth}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>
              {t('loginsThisMonth')}
            </Typography>
          </Paper>

          <Paper
            sx={{
              flex: '1 0 auto',
              minWidth: 90,
              p: 1.5,
              borderRadius: '14px',
              textAlign: 'center',
              bgcolor: 'background.paper'
            }}
          >
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: '#22C55E' }}>
              {onlineUserIds.size}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>
              {t('onlineNow')}
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Force Refresh All Clients */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={handleForceRefresh}
          disabled={forceRefreshSent}
          sx={{
            bgcolor: forceRefreshSent ? '#22C55E' : '#EF4444',
            '&:hover': { bgcolor: forceRefreshSent ? '#22C55E' : '#DC2626' },
            borderRadius: '12px',
            py: 1.5,
            fontWeight: 700,
            fontSize: 14,
            textTransform: 'none',
          }}
        >
          {forceRefreshSent ? t('forceRefreshSent') : t('forceRefreshAll')}
        </Button>
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
          <Tab label={loading ? t('loginActivity') : `${t('loginActivity')} (${filteredActivities.length})`} />
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
              />
            )}

            {/* Activity Table or Loading */}
            {loading ? <LoadingSkeleton /> : <ActivityTable activities={filteredActivities} />}
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
