import { useState, useMemo } from 'react';
import { Box, Typography, Paper, IconButton, Skeleton, TextField, InputAdornment, Button, keyframes } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';
import { useAuth } from '../../../global/hooks';
import { useAdminDashboard, useOnlineUsers } from '../hooks/admin-hooks';
import { UsersTable } from './UsersTable';
import { RecentActivityFeed } from './RecentActivityFeed';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

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
  const isRtl = settings.language === 'he';

  const onlineUserIds = useMemo(() => {
    if (!user?.id) return socketOnlineUserIds;
    if (socketOnlineUserIds.has(user.id)) return socketOnlineUserIds;
    const merged = new Set(socketOnlineUserIds);
    merged.add(user.id);
    return merged;
  }, [socketOnlineUserIds, user?.id]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return usersWithLoginInfo;
    const searchLower = userSearch.toLowerCase();
    return usersWithLoginInfo.filter(u =>
      u.name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower)
    );
  }, [usersWithLoginInfo, userSearch]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFB' }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 50%, #2DD4BF 100%)',
          pt: 'max(env(safe-area-inset-top), 16px)',
          pb: 8,
          px: 2,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* עיגולים דקורטיביים */}
        <Box sx={{
          position: 'absolute',
          top: -40,
          [isRtl ? 'left' : 'right']: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.08)',
        }} />
        <Box sx={{
          position: 'absolute',
          bottom: 20,
          [isRtl ? 'right' : 'left']: -30,
          width: 100,
          height: 100,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.05)',
        }} />

        {/* כותרת + כפתורים */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={() => navigate('/settings')}
              sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            >
              {isRtl ? <ArrowForwardIcon /> : <ArrowBackIcon />}
            </IconButton>
            <Typography sx={{ color: 'white', fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
              {t('adminDashboard')}
            </Typography>
          </Box>
          <IconButton
            onClick={refreshData}
            sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* Glass Stats Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, position: 'relative', zIndex: 1 }}>
          {/* מחוברים עכשיו */}
          <Box sx={{
            p: 1.5,
            borderRadius: '16px',
            bgcolor: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.25)',
            textAlign: 'center',
          }}>
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
          <Box sx={{
            p: 1.5,
            borderRadius: '16px',
            bgcolor: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.25)',
            textAlign: 'center',
          }}>
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
          <Box sx={{
            p: 1.5,
            borderRadius: '16px',
            bgcolor: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.25)',
            textAlign: 'center',
          }}>
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
      </Box>

      {/* Content */}
      <Box sx={{ px: 2, mt: -4, position: 'relative', zIndex: 2 }}>
        {/* שגיאה */}
        {error && !loading && (
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 3, mb: 2 }}>
            <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
            <Button
              variant="contained"
              onClick={refreshData}
              sx={{ bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0D9488' }, borderRadius: 2 }}
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
                bgcolor: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: 'none',
                '& fieldset': { border: '1px solid rgba(0,0,0,0.06)' },
                '&:hover fieldset': { borderColor: '#14B8A6' },
                '&.Mui-focused fieldset': { borderColor: '#14B8A6', borderWidth: 1.5 },
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#9CA3AF' }} />
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

        {/* ריווח תחתון */}
        <Box sx={{ height: 32 }} />
      </Box>
    </Box>
  );
};
