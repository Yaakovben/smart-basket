import { Box, Typography } from '@mui/material';
import type { InsightsData } from '../../../../../services/api';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS } from '../../../../../global/constants';
import { fadeIn } from '../../insightsShared';

interface PulseUpcomingNeedsProps {
  upcomingNeeds: InsightsData['upcomingNeeds'];
  isDark: boolean;
  t: (key: string) => string;
}

// כרטיס "צפוי בקרוב לפי המחזור שלך" - קטגוריות שקרוב הזמן לקנות אותן שוב.
export const PulseUpcomingNeeds = ({ upcomingNeeds, isDark, t }: PulseUpcomingNeedsProps) => {
  if (!upcomingNeeds || upcomingNeeds.length === 0) return null;
  return (
    <Box sx={{
      p: 1.75, mb: 2, borderRadius: '16px',
      background: isDark
        ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(20,184,166,0.05))'
        : 'linear-gradient(135deg, rgba(245,158,11,0.07), rgba(20,184,166,0.04))',
      border: '1px solid',
      borderColor: isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.2)',
      animation: `${fadeIn} 0.5s ease 0.1s both`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
        <Typography sx={{ fontSize: 18 }}>🔮</Typography>
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: 'text.primary' }}>
          {t('upcomingByYourCycleTitle')}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
        {upcomingNeeds.map((u) => {
          const transKey = CATEGORY_TRANSLATION_KEYS[u.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
          const label = transKey ? t(transKey) : u.category;
          const icon = CATEGORY_ICONS[u.category as keyof typeof CATEGORY_ICONS] || '📦';
          const overdueText = u.daysOverdue >= 1
            ? t('overdueDays').replace('{days}', String(u.daysOverdue))
            : u.daysOverdue === 0
              ? t('expectedToday')
              : u.daysOverdue === -1
                ? t('expectedTomorrow')
                : t('expectedInDays').replace('{days}', String(Math.abs(u.daysOverdue)));
          const isOverdue = u.daysOverdue >= 0;
          return (
            <Box key={u.category} sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              py: 0.75, px: 1, borderRadius: '10px',
              bgcolor: isOverdue
                ? (isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)')
                : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
            }}>
              <Typography sx={{ fontSize: 18, flexShrink: 0 }}>{icon}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{label}</Typography>
              <Typography sx={{
                fontSize: 11, fontWeight: 800,
                color: isOverdue ? '#D97706' : 'text.secondary',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {overdueText}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
