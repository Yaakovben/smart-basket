import { Box, Typography, Skeleton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import LoginIcon from '@mui/icons-material/Login';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import type { TranslationKeys } from '../../../global/i18n/translations';
import type { DashboardStats, UserFilter } from '../types';
import { cardSx, infoCardSx, pulse } from '../styles/AdminDashboard.styles';

interface AdminDashboardStatCardsProps {
  userFilter: UserFilter;
  onlineCount: number;
  stats: DashboardStats;
  loading?: boolean;
  onFilterClick: (filter: UserFilter) => void;
  onSelectAll: () => void;
  t: (key: TranslationKeys) => string;
}

// Skeleton קצר לספרה של כרטיס סטטיסטיקה בזמן טעינה
const StatSkeleton = ({ large }: { large?: boolean }) => (
  <Skeleton
    variant="rounded"
    width={large ? 56 : 44}
    height={large ? 32 : 24}
    sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1, mx: 'auto' }}
  />
);

// כרטיסי סטטיסטיקה לחיצים בכותרת - משמשים גם כפילטר לטבלת המשתמשים
export const AdminDashboardStatCards = ({ userFilter, onlineCount, stats, loading, onFilterClick, onSelectAll, t }: AdminDashboardStatCardsProps) => (
  <>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, position: 'relative', zIndex: 1, mb: 1.25 }}>
      {/* מחוברים עכשיו */}
      <Box sx={cardSx(userFilter === 'online')} onClick={() => onFilterClick('online')}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
          <Box sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: '#4ADE80',
            boxShadow: '0 0 8px rgba(74, 222, 128, 0.6)',
            animation: `${pulse} 2s ease-in-out infinite`,
          }} />
          {loading
            ? <StatSkeleton large />
            : <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1 }}>{onlineCount}</Typography>
          }
        </Box>
        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 500, mt: 0.5 }}>
          {t('onlineNow')}
        </Typography>
      </Box>

      {/* פעילים היום */}
      <Box sx={cardSx(userFilter === 'activeToday')} onClick={() => onFilterClick('activeToday')}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <TrendingUpIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
          {loading
            ? <StatSkeleton large />
            : <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1 }}>{stats.uniqueUsersToday}</Typography>
          }
        </Box>
        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 500, mt: 0.5 }}>
          {t('activeToday')}
        </Typography>
      </Box>

      {/* סה"כ משתמשים */}
      <Box sx={cardSx(userFilter === 'all')} onClick={onSelectAll}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <PeopleIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
          {loading
            ? <StatSkeleton large />
            : <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1 }}>{stats.totalUsers}</Typography>
          }
        </Box>
        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 500, mt: 0.5 }}>
          {t('totalUsers')}
        </Typography>
      </Box>
    </Box>

    {/* שורה שנייה - מידע נוסף */}
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, position: 'relative', zIndex: 1 }}>
      <Box sx={infoCardSx(userFilter === 'loginsToday')} onClick={() => onFilterClick('loginsToday')}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <LoginIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
          {loading
            ? <StatSkeleton />
            : <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'white', lineHeight: 1 }}>{stats.loginsToday}</Typography>
          }
        </Box>
        <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 500, mt: 0.25 }}>
          {t('loginsToday')}
        </Typography>
      </Box>

      <Box sx={infoCardSx(userFilter === 'activeThisMonth')} onClick={() => onFilterClick('activeThisMonth')}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <CalendarMonthIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
          {loading
            ? <StatSkeleton />
            : <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'white', lineHeight: 1 }}>{stats.uniqueUsersThisMonth}</Typography>
          }
        </Box>
        <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 500, mt: 0.25 }}>
          {t('uniqueUsersThisMonth')}
        </Typography>
      </Box>
    </Box>
  </>
);
