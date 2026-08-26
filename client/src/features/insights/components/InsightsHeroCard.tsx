import { Box, Typography } from '@mui/material';
import type { InsightsData } from '../../../services/api';
import { fadeIn } from './insightsShared';
import type { InsightTab } from '../types/insights-types';

interface InsightsHeroCardProps {
  tab: InsightTab;
  groupStats: InsightsData['groupStats'];
  shoppingScore?: number;
  t: (key: string) => string;
}

interface Insight { emoji: string; title: string; subtitle?: string; gradient: string }

// Hero card - תובנת היום, ניסוח חיובי וברור. שונה לפי הטאב הנוכחי.
export const InsightsHeroCard = ({ tab, groupStats, shoppingScore, t }: InsightsHeroCardProps) => {
  let insight: Insight | null = null;
  // טאב מחירים: כרטיס Hero של PriceComparisonCard כבר מציג 'הזול ב-X' באופן בולט -
  // אין צורך בכרטיס "תובנת היום" נוסף שיציג אותו דבר. מדלגים כדי למנוע כפילות.
  if (tab === 'price') {
    insight = null;
  } else if (tab === 'lists' && groupStats?.[0]) {
    const top = groupStats[0];
    insight = {
      emoji: '📋',
      title: t('heroMostActive').replace('{name}', top.name),
      subtitle: top.topContributor
        ? t('heroTopContributor').replace('{name}', top.topContributor.name)
        : t('membersCountLabel').replace('{count}', String(top.membersCount)),
      gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)',
    };
  } else if (tab === 'activity' && shoppingScore !== undefined) {
    const label = shoppingScore >= 80 ? t('scoreLabelChampion') : shoppingScore >= 60 ? t('scoreLabelOnTrack') : shoppingScore >= 40 ? t('scoreLabelDeveloping') : t('scoreLabelRoomToGrow');
    insight = {
      emoji: shoppingScore >= 80 ? '🎯' : shoppingScore >= 60 ? '📈' : '🌱',
      title: `${shoppingScore}/100`,
      subtitle: label,
      gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)',
    };
  }
  if (!insight) return null;

  return (
    <Box sx={{ px: 2, mb: 1.5 }} key={`insight-${tab}`}>
      <Box sx={{
        p: 2.25, borderRadius: '20px',
        background: insight.gradient,
        boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
        color: 'white',
        display: 'flex', alignItems: 'center', gap: 1.75,
        animation: `${fadeIn} 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
        position: 'relative', overflow: 'hidden',
        minHeight: 84,
        // עומק רב-שכבתי - 2 גרדיאנטים רדיאליים, נותן תחושת קלף יוקרתי
        '&::before': {
          content: '""', position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at top right, rgba(255,255,255,0.22), transparent 55%), radial-gradient(circle at bottom left, rgba(0,0,0,0.15), transparent 50%)',
          pointerEvents: 'none',
        },
        // ברק עליון עדין
        '&::after': {
          content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent)',
          pointerEvents: 'none',
        },
      }}>
        <Box sx={{
          width: 56, height: 56, borderRadius: '16px',
          bgcolor: 'rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, flexShrink: 0,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.12)',
          position: 'relative', zIndex: 1,
        }}>
          {insight.emoji}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
          <Typography sx={{ fontSize: 19, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            {insight.title}
          </Typography>
          {insight.subtitle && (
            <Typography sx={{ fontSize: 12.5, opacity: 0.92, mt: 0.5, fontWeight: 500 }}>
              {insight.subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};
