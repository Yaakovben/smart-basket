import { Box, Typography, Paper, IconButton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';
import { useAdminDashboard } from '../hooks/admin-hooks';
import { ActivityFilters } from './ActivityFilters';
import { ActivityTable } from './ActivityTable';
import { COMMON_STYLES } from '../../../global/constants';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t } = useSettings();
  const {
    filteredActivities,
    stats,
    filters,
    setFilterMode,
    setSelectedDate,
    setSelectedMonth,
    setSelectedHour
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
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

        {/* Stats Cards */}
        <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1 }}>
          <Paper
            sx={{
              flex: '1 0 auto',
              minWidth: 100,
              p: 2,
              borderRadius: '14px',
              textAlign: 'center',
              bgcolor: 'rgba(255,255,255,0.95)'
            }}
          >
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#14B8A6' }}>
              {stats.totalUsers}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('totalUsers')}
            </Typography>
          </Paper>

          <Paper
            sx={{
              flex: '1 0 auto',
              minWidth: 100,
              p: 2,
              borderRadius: '14px',
              textAlign: 'center',
              bgcolor: 'rgba(255,255,255,0.95)'
            }}
          >
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#8B5CF6' }}>
              {stats.loginsToday}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('loginsToday')}
            </Typography>
          </Paper>

          <Paper
            sx={{
              flex: '1 0 auto',
              minWidth: 100,
              p: 2,
              borderRadius: '14px',
              textAlign: 'center',
              bgcolor: 'rgba(255,255,255,0.95)'
            }}
          >
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>
              {stats.loginsThisMonth}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('loginsThisMonth')}
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2 }}>
        {/* Filters */}
        <ActivityFilters
          filters={filters}
          onFilterModeChange={setFilterMode}
          onDateChange={setSelectedDate}
          onMonthChange={setSelectedMonth}
          onHourChange={setSelectedHour}
        />

        {/* Activity Title */}
        <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 2, color: 'text.primary' }}>
          {t('loginActivity')} ({filteredActivities.length})
        </Typography>

        {/* Activity Table */}
        <ActivityTable activities={filteredActivities} />
      </Box>
    </Box>
  );
};
