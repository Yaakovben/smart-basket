import { Box, Typography } from '@mui/material';
import { fadeIn } from './animations';

// ===== Activity Dot Calendar - 30 יום אחרונים כרשת נקודות =====
// מבוסס על weeklyTrends שכבר קיים (8 שבועות, ~56 יום). מציג רק 30 הימים
// האחרונים. דמיון ל-GitHub contribution graph - קומפקטי ויזואלי.
// כל "נקודה" = יום, אינטנסיביות הצבע משקפת פעילות יחסית.
export const ActivityDotCalendar = ({ weeklyTrends, isDark, t }: {
  weeklyTrends: { week: string; added: number; purchased: number }[];
  isDark: boolean;
  t: (key: string) => string;
}) => {
  if (!weeklyTrends || weeklyTrends.length === 0) return null;
  // 30 יום ≈ 4.3 שבועות. נציג 5 שבועות אחרונים = 35 ימים.
  const recent = weeklyTrends.slice(-5);
  // אין לנו נתון יומי - מחלקים את שבועי-נתוני (added+purchased) באופן יחסי.
  // ממוצע יומי לשבוע, אבל מסמנים "פעיל" רק אם יש פעילות אמיתית בשבוע.
  const totalActivity = recent.reduce((s, w) => s + w.added + w.purchased, 0);
  if (totalActivity === 0) return null;

  const max = Math.max(...recent.map(w => w.added + w.purchased), 1);
  const days = recent.flatMap(w => {
    const intensity = (w.added + w.purchased) / max;
    return Array.from({ length: 7 }, () => intensity);
  }).slice(-30); // 30 ימים אחרונים

  return (
    <Box sx={{
      mb: 2, p: 1.5, borderRadius: '14px',
      backgroundImage: isDark
        ? 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(255,255,255,0.02))'
        : 'linear-gradient(135deg, rgba(20,184,166,0.05), rgba(255,255,255,0.7))',
      border: '1px solid',
      borderColor: isDark ? 'rgba(20,184,166,0.2)' : 'rgba(20,184,166,0.15)',
      boxShadow: isDark
        ? 'inset 0 1px 0 rgba(255,255,255,0.04)'
        : 'inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 8px rgba(20,184,166,0.06)',
      animation: `${fadeIn} 0.4s ease both`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: isDark ? '#5EEAD4' : '#0F766E', letterSpacing: 0.4 }}>
          {t('last30DaysLabel')}
        </Typography>
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontWeight: 700 }}>
          {t('oldToNewLabel')}
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 0.4 }}>
        {days.map((intensity, i) => (
          <Box
            key={i}
            title={intensity > 0 ? t('activeDayLabel') : t('noActivityLabel')}
            sx={{
              aspectRatio: '1', borderRadius: '3px',
              bgcolor: intensity === 0
                ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')
                : `rgba(20,184,166,${0.2 + intensity * 0.7})`,
              boxShadow: intensity > 0.7 ? '0 0 4px rgba(20,184,166,0.5)' : 'none',
              transition: 'transform 0.1s ease',
              '&:hover': intensity > 0 ? { transform: 'scale(1.3)' } : {},
              animation: `${fadeIn} 0.4s ease ${i * 0.012}s both`,
            }}
          />
        ))}
      </Box>
      {/* Legend - אינטנסיביות */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.4, mt: 1 }}>
        <Typography sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 700 }}>{t('lessLabel')}</Typography>
        {[0, 0.25, 0.5, 0.75, 1].map(i => (
          <Box key={i} sx={{
            width: 9, height: 9, borderRadius: '2px',
            bgcolor: i === 0 ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)') : `rgba(20,184,166,${0.2 + i * 0.7})`,
          }} />
        ))}
        <Typography sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 700 }}>{t('moreLabel')}</Typography>
      </Box>
    </Box>
  );
};
