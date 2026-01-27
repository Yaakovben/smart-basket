import { useState } from 'react';
import { Box, Typography, Paper, IconButton, Tabs, Tab } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';
import { useAdminDashboard } from '../hooks/admin-hooks';
import { ActivityFilters } from './ActivityFilters';
import { ActivityTable } from './ActivityTable';
import { UsersTable } from './UsersTable';
import { COMMON_STYLES } from '../../../global/constants';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const [activeTab, setActiveTab] = useState(0);
  const {
    filteredActivities,
    usersWithLoginInfo,
    stats,
    filters,
    setFilterMode,
    setSelectedDate,
    setSelectedMonth,
    setSelectedHour,
    refreshData
  } = useAdminDashboard();

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
              <ArrowForwardIcon />
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
              bgcolor: 'rgba(255,255,255,0.95)'
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
              bgcolor: 'rgba(255,255,255,0.95)'
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
              bgcolor: 'rgba(255,255,255,0.95)'
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
              bgcolor: 'rgba(255,255,255,0.95)'
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
              bgcolor: 'rgba(255,255,255,0.95)'
            }}
          >
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: '#3B82F6' }}>
              {stats.loginsThisMonth}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>
              {t('loginsThisMonth')}
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2 }}>
        {/* Tabs */}
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
              fontSize: 14,
              textTransform: 'none',
              minWidth: 'auto',
              px: 2,
              color: 'text.secondary',
              '&.Mui-selected': {
                color: '#14B8A6'
              }
            }
          }}
        >
          <Tab label={`${t('loginActivity')} (${filteredActivities.length})`} />
          <Tab label={`${t('registeredUsers')} (${usersWithLoginInfo.length})`} />
        </Tabs>

        {activeTab === 0 && (
          <>
            {/* Filters */}
            <ActivityFilters
              filters={filters}
              onFilterModeChange={setFilterMode}
              onDateChange={setSelectedDate}
              onMonthChange={setSelectedMonth}
              onHourChange={setSelectedHour}
            />

            {/* Activity Table */}
            <ActivityTable activities={filteredActivities} />
          </>
        )}

        {activeTab === 1 && (
          <UsersTable users={usersWithLoginInfo} language={settings.language} />
        )}
      </Box>
    </Box>
  );
};
