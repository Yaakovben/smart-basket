import { memo } from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useSettings } from '../../../../global/context/SettingsContext';
import { getRelativeTime } from '../../../../global/helpers/dateFormatting';

// ===== אנימציות בר התקדמות =====
const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 4px rgba(34, 197, 94, 0.4), 0 0 8px rgba(34, 197, 94, 0.2); }
  50% { box-shadow: 0 0 8px rgba(34, 197, 94, 0.6), 0 0 16px rgba(34, 197, 94, 0.3); }
`;

const checkBounce = keyframes`
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); opacity: 1; }
`;

// ===== סטטוס: זמן עדכון + בר התקדמות =====
interface ListProgressBarProps {
  updatedAt?: string;
  pendingCount: number;
  purchasedCount: number;
}

export const ListProgressBar = memo(({ updatedAt, pendingCount, purchasedCount }: ListProgressBarProps) => {
  const { t, settings } = useSettings();

  if (!(updatedAt || (pendingCount + purchasedCount) > 0)) return null;

  const total = pendingCount + purchasedCount;
  const percent = total > 0 ? Math.round((purchasedCount / total) * 100) : 0;
  const isComplete = percent === 100;

  // גרדיאנט דינמי לפי אחוז השלמה - ניגודיות חזקה על רקע טורקיז
  const barGradient = isComplete
    ? 'linear-gradient(90deg, #22C55E, #4ADE80, #86EFAC)'
    : percent >= 75
      ? 'linear-gradient(90deg, #FBBF24, #FDE68A, #FEF9C3)'
      : percent >= 50
        ? 'linear-gradient(90deg, #F97316, #FB923C, #FBBF24)'
        : percent >= 25
          ? 'linear-gradient(90deg, #EF4444, #F97316, #FB923C)'
          : 'linear-gradient(90deg, #DC2626, #EF4444, #F87171)';

  // צבע טקסט לפי אחוז - בולט על רקע טורקיז
  const textColor = isComplete
    ? '#86EFAC'
    : percent >= 75 ? '#FDE68A'
    : percent >= 50 ? '#FDBA74'
    : percent >= 25 ? '#FCA5A5'
    : '#FCA5A5';

  return (
    <Box sx={{
      mt: 0.75,
      // מוסתר ב-landscape כדי לחסוך עוד גובה
      '@media (orientation: landscape) and (max-height: 500px)': { display: 'none' },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
        {updatedAt && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <AccessTimeIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              {t('updated')} {updatedAt ? getRelativeTime(updatedAt, settings.language) : ''}
            </Typography>
          </Box>
        )}
        {total > 0 && (
          <Typography sx={{
            color: textColor,
            fontSize: 11,
            fontWeight: 700,
            transition: 'color 0.3s ease',
            ...(isComplete && {
              animation: `${checkBounce} 0.4s ease-out`,
              textShadow: '0 0 8px rgba(34, 197, 94, 0.5)'
            })
          }}>
            {isComplete ? '✓ 100%' : `${percent}%`}
          </Typography>
        )}
      </Box>
      {total > 0 && (
        <Box sx={{
          height: isComplete ? 4 : 3,
          bgcolor: 'rgba(255,255,255,0.1)',
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'height 0.3s ease',
          ...(isComplete && {
            animation: `${pulseGlow} 1.5s ease-in-out 3`
          })
        }}>
          <Box sx={{
            height: '100%',
            width: `${percent}%`,
            background: barGradient,
            borderRadius: 2,
            transition: 'width 0.5s ease, background 0.3s ease',
            ...(percent >= 75 && !isComplete && {
              boxShadow: '0 0 6px rgba(251, 191, 36, 0.5)'
            })
          }} />
        </Box>
      )}
    </Box>
  );
});
ListProgressBar.displayName = 'ListProgressBar';
