import { useState, useMemo } from 'react';
import { Box, Typography, Paper, IconButton, Skeleton, TextField, InputAdornment, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';
import { useAuth } from '../../../global/hooks';
import { useAdminDashboard, useOnlineUsers } from '../hooks/admin-hooks';
import { UsersTable } from './UsersTable';
import { RecentActivityFeed } from './RecentActivityFeed';
import { COMMON_STYLES } from '../../../global/constants';

const SKELETON_INDICES = [1, 2, 3, 4] as const;

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
  const [userSearch, setUserSearch] = useState('');
  const {
    activities,
    usersWithLoginInfo,
    stats,
    refreshData,
    loading,
    error
  } = useAdminDashboard();
  const socketOnlineUserIds = useOnlineUsers();

  // המשתמש הנוכחי בהכרח מחובר
  const onlineUserIds = useMemo(() => {
    if (!user?.id) return socketOnlineUserIds;
    if (socketOnlineUserIds.has(user.id)) return socketOnlineUserIds;
    const merged = new Set(socketOnlineUserIds);
    merged.add(user.id);
    return merged;
  }, [socketOnlineUserIds, user?.id]);

  // סינון משתמשים לפי חיפוש
  const filteredUsers = useMemo(() => {
    if (!userSearch) return usersWithLoginInfo;
    const searchLower = userSearch.toLowerCase();
    return usersWithLoginInfo.filter(u =>
      u.name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower)
    );
  }, [usersWithLoginInfo, userSearch]);

  const statCards = [
    { value: onlineUserIds.size, label: t('onlineNow'), color: '#22C55E' },
    { value: stats.uniqueUsersToday, label: t('activeToday'), color: '#14B8A6' },
    { value: stats.totalUsers, label: t('totalUsers'), color: '#6B7280' },
  ];

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

        {/* 3 כרטיסי סטטיסטיקה */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
          {statCards.map((stat, i) => (
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
        {/* שגיאה */}
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

        {/* חיפוש */}
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

        {/* טבלת משתמשים */}
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <UsersTable
            users={filteredUsers}
            activities={activities}
            language={settings.language}
            onlineUserIds={onlineUserIds}
          />
        )}

        {/* פיד פעילות אחרונה */}
        {!loading && activities.length > 0 && (
          <RecentActivityFeed activities={activities} language={settings.language} />
        )}
      </Box>
    </Box>
  );
};
