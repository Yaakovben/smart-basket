import { useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { haptic } from '../../../../../global/helpers';
import { fadeIn, scoreEmoji, AnimatedNumber, ScoreTrendBadge, useScoreDelta } from '../../insightsShared';
import { useSettings } from '../../../../../global/context/SettingsContext';

interface PulseScoreCardProps {
  shoppingScore: number;
  completionRate: number;
  isDark: boolean;
}

// כרטיס "ציון הקנייה שלך" - עיגול התקדמות עם ציון 0-100, לחיץ להרחבת הסבר.
export const PulseScoreCard = ({ shoppingScore, completionRate, isDark }: PulseScoreCardProps) => {
  const { t } = useSettings();
  const [scoreExplained, setScoreExplained] = useState(false);
  // הפרש הציון מהביקור הקודם - מוצג כתווית ליד הציון
  const scoreDelta = useScoreDelta(shoppingScore);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => { haptic('light'); setScoreExplained(v => !v); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          haptic('light');
          setScoreExplained(v => !v);
        }
      }}
      sx={{
        p: 2, mb: 2, borderRadius: '16px', cursor: 'pointer',
        border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        bgcolor: 'background.paper',
        userSelect: 'none', outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        transition: 'opacity 0.1s, box-shadow 0.2s ease',
        '&:hover': { boxShadow: isDark ? '0 4px 16px rgba(20,184,166,0.15)' : '0 4px 14px rgba(20,184,166,0.1)' },
        '&:active': { opacity: 0.9 },
        '&:focus-visible': { boxShadow: '0 0 0 2px #14B8A6' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 0.75 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{t('scoreCardTitle')}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <ScoreTrendBadge delta={scoreDelta} />
          <Typography sx={{
            fontSize: 10, fontWeight: 700, color: 'text.disabled',
            transition: 'transform 0.2s ease',
            transform: scoreExplained ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>▼</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ position: 'relative', width: 92, height: 92, flexShrink: 0 }}>
          <CircularProgress variant="determinate" value={100} size={92} thickness={4}
            sx={{ color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', position: 'absolute' }} />
          <CircularProgress variant="determinate" value={shoppingScore} size={92} thickness={4}
            sx={{ color: '#14B8A6', position: 'absolute', '& .MuiCircularProgress-circle': { strokeLinecap: 'round', transition: 'stroke-dashoffset 1s ease' } }} />
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 22, lineHeight: 1 }}>{scoreEmoji(shoppingScore)}</Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 900, color: 'text.primary', lineHeight: 1, mt: 0.15, fontVariantNumeric: 'tabular-nums' }}>
              <AnimatedNumber value={shoppingScore} />
            </Typography>
          </Box>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
            {t('completionPct').replace('{pct}', String(completionRate))}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5, lineHeight: 1.5 }}>
            {scoreExplained ? t('tapToClose') : t('scoreBasedHint')}
          </Typography>
        </Box>
      </Box>
      {scoreExplained && (
        <Box sx={{
          mt: 1.5, pt: 1.5, borderTop: '1px dashed',
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          animation: `${fadeIn} 0.2s ease both`,
        }}>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.7, mb: 1 }}>
            {t('scoreCalcExplainedIntro')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#14B8A6', opacity: 0.95 }} />
              <Typography sx={{ fontSize: 11.5, color: 'text.primary' }}>
                <b>{t('metricCompletionRate')}</b> {t('metricCompletionRateDesc')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#14B8A6', opacity: 0.7 }} />
              <Typography sx={{ fontSize: 11.5, color: 'text.primary' }}>
                <b>{t('metricStreak')}</b> {t('metricStreakDesc')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#14B8A6', opacity: 0.45 }} />
              <Typography sx={{ fontSize: 11.5, color: 'text.primary' }}>
                <b>{t('metricCategoryVariety')}</b> {t('metricCategoryVarietyDesc')}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};
