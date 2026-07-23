import { Box, Typography } from '@mui/material';
import {
  containerSx, cardSx, iconWrapperSx, haloSx, iconFloatSx, floatingItemSx,
  titleSx, descriptionSx, tipsContainerSx, tipChipSx, ctaButtonSx,
} from '../../styles/InsightsEmptyState.styles';

// ===== מסך ריק עם דמות חמודה - דמות מרכזית, פריטים מרחפים, וטקסט CTA =====
// שימוש:
//   <InsightsEmptyState mainEmoji="🛍️" title="..." description="..." floatingItems={['🥕','🍞']} accent="#14B8A6" />
//   עם CTA: ...ctaLabel="התחל קנייה" ctaIcon={<HomeIcon />} onCtaClick={() => navigate('/')}
//   עם טיפים: tips={['סמן מוצרים שקנית', 'הוסף מוצרים חדשים', ...]}
export const InsightsEmptyState = ({
  mainEmoji,
  title,
  description,
  floatingItems = ['✨', '⭐', '💫', '🌟'],
  accent = '#14B8A6',
  isDark,
  ctaLabel,
  ctaIcon,
  onCtaClick,
  tips,
}: {
  mainEmoji: string;
  title: string;
  description: string;
  floatingItems?: string[];
  accent?: string;
  isDark: boolean;
  ctaLabel?: string;
  ctaIcon?: React.ReactNode;
  onCtaClick?: () => void;
  tips?: string[];
}) => (
  <Box sx={containerSx}>
    {/* כרטיס מכיל עם רקע עדין + מסגרת רכה - נותן יותר נוכחות לאלמנט */}
    <Box sx={cardSx(accent, isDark)}>
      {/* דמות חמודה - אייקון מרכזי + halo + 4 פריטים מרחפים */}
      <Box sx={iconWrapperSx}>
        <Box sx={haloSx(accent, isDark)} />
        <Box sx={iconFloatSx}>{mainEmoji}</Box>
        {floatingItems.slice(0, 4).map((emoji, i) => (
          <Box key={i} sx={floatingItemSx(i)}>{emoji}</Box>
        ))}
      </Box>
      <Typography sx={titleSx}>{title}</Typography>
      <Typography sx={descriptionSx}>{description}</Typography>

      {/* טיפים מודרגים - אם סופקו, מציגים כצ'יפים קטנים */}
      {tips && tips.length > 0 && (
        <Box sx={tipsContainerSx}>
          {tips.slice(0, 3).map((tip, i) => (
            <Box key={i} sx={tipChipSx(accent, isDark)}>{tip}</Box>
          ))}
        </Box>
      )}

      {/* CTA - כפתור אופציונלי לפעולה מומלצת */}
      {ctaLabel && onCtaClick && (
        <Box
          role="button"
          tabIndex={0}
          onClick={onCtaClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCtaClick(); }}
          sx={ctaButtonSx(accent)}
        >
          {ctaIcon}
          <span>{ctaLabel}</span>
        </Box>
      )}
    </Box>
  </Box>
);
