import { Box, Typography } from '@mui/material';
import { fadeIn } from './animations';
import { useSettings } from '../../../../global/context/SettingsContext';

// ===== Group Leadership Hero - "אתה מוביל ב-X קבוצות" =====
// מציג סטטוס מנהיגות מצרפי על פני כל הקבוצות. אם המשתמש מקום ראשון
// בכמה - תצוגה צוהלת. אם לא - עידוד עדין.
export const GroupLeadershipHero = ({ leadingCount, totalGroups }: {
  leadingCount: number; totalGroups: number; isDark?: boolean;
}) => {
  const { t } = useSettings();
  if (totalGroups === 0) return null;

  const isWinner = leadingCount > 0;
  const gradient = isWinner
    ? 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #DC2626 100%)'
    : 'linear-gradient(135deg, #14B8A6, #0D9488)';
  const emoji = isWinner ? (leadingCount >= 2 ? '👑' : '🏆') : '🤝';
  const title = isWinner
    ? leadingCount === totalGroups
      ? t('kingOfGroups')
      : t('leadingInGroupsCount').replace('{count}', String(leadingCount)).replace('{groupWord}', leadingCount === 1 ? t('groupWordSingle') : t('groupWordPlural'))
    : t('partnerInGroupsCount').replace('{count}', String(totalGroups)).replace('{groupWord}', totalGroups === 1 ? t('groupWordSingle') : t('groupWordPlural'));
  const subtitle = isWinner
    ? leadingCount === totalGroups
      ? t('firstPlaceEveryGroup')
      : t('outOfTotalGroups').replace('{total}', String(totalGroups))
    : t('addMoreToLead');

  return (
    <Box sx={{
      mb: 2, p: 1.75, borderRadius: '16px',
      background: gradient, color: 'white',
      display: 'flex', alignItems: 'center', gap: 1.5,
      boxShadow: isWinner
        ? '0 8px 24px rgba(245,158,11,0.4)'
        : '0 6px 18px rgba(20,184,166,0.3)',
      animation: `${fadeIn} 0.5s ease 0.05s both`,
      position: 'relative', overflow: 'hidden',
    }}>
      {isWinner && (
        <Box sx={{
          position: 'absolute', top: -25, left: -25, width: 110, height: 110,
          borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)',
        }} />
      )}
      <Box sx={{
        fontSize: 38, lineHeight: 1, flexShrink: 0, zIndex: 1,
        animation: isWinner ? 'crownBounce 2.4s ease-in-out infinite' : 'none',
        '@keyframes crownBounce': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-3px) scale(1.05)' },
        },
      }}>
        {emoji}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, zIndex: 1 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 900, lineHeight: 1.15, letterSpacing: -0.3 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 11.5, opacity: 0.92, mt: 0.3 }}>
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
};
