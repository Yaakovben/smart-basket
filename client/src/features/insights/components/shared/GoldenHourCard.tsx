import { Box, Typography } from '@mui/material';
import { fadeIn } from './animations';

// ===== "השעה הזהובה" - הזמן שבו המשתמש הכי פעיל =====
// משתמש ב-hourlyActivity שכבר מחושב. מציג טקסט אישי עם השעה השיא
// ופרשנות אנושית ("אתה איש בוקר", "ינשוף לילה" וכו׳).
export const GoldenHourCard = ({ hourlyActivity }: {
  hourlyActivity: number[]; isDark?: boolean;
}) => {
  if (!hourlyActivity || hourlyActivity.every(v => v === 0)) return null;
  const peak = hourlyActivity.indexOf(Math.max(...hourlyActivity));
  const total = hourlyActivity.reduce((a, b) => a + b, 0);
  const peakPct = total > 0 ? Math.round((hourlyActivity[peak] / total) * 100) : 0;

  // פרשנות זמן ביום - גבולות זהים ל-buckets ב-PulseTab כדי שלא תהיה
  // אי-עקביות בין הכרטיס הזה לבין שעון השעות (5-11 בוקר, 12-16 צהריים,
  // 17-22 ערב, 23-04 לילה).
  let label: string; let emoji: string; let gradient: string;
  if (peak >= 5 && peak <= 11) {
    label = 'איש בוקר'; emoji = '🌅';
    gradient = 'linear-gradient(135deg, #FBBF24, #F59E0B, #F97316)';
  } else if (peak >= 12 && peak <= 16) {
    label = 'אנרגיית צהריים'; emoji = '☀️';
    gradient = 'linear-gradient(135deg, #FCD34D, #FBBF24, #F59E0B)';
  } else if (peak >= 17 && peak <= 22) {
    label = 'איש ערב'; emoji = '🌆';
    gradient = 'linear-gradient(135deg, #F472B6, #EC4899, #BE185D)';
  } else {
    label = 'ינשוף לילה'; emoji = '🌙';
    gradient = 'linear-gradient(135deg, #6366F1, #4F46E5, #1E1B4B)';
  }

  return (
    <Box sx={{
      mb: 2, p: 1.5, borderRadius: '14px',
      background: gradient, color: 'white',
      display: 'flex', alignItems: 'center', gap: 1.25,
      boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
      animation: `${fadeIn} 0.45s ease 0.15s both`,
    }}>
      <Typography sx={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{emoji}</Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 800, opacity: 0.92, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          השעה הזהובה
        </Typography>
        <Typography sx={{ fontSize: 16, fontWeight: 900, lineHeight: 1.2, mt: 0.15 }}>
          אתה <Typography component="span" sx={{ fontWeight: 900 }}>{label}</Typography>
        </Typography>
        <Typography sx={{ fontSize: 11, opacity: 0.92, mt: 0.25 }}>
          שיא פעילות ב-{peak}:00 · {peakPct}% מהפעולות
        </Typography>
      </Box>
    </Box>
  );
};
