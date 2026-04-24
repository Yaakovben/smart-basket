import { memo } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

// לודר לתובנות: 3 עיגולים מדורגים שממלאים ומתרוקנים כמו גלי נתונים
// שנבדקים. עיצוב אבסטרקטי ונקי — בלי אמוג'ים מסתובבים. מרגיש "ניתוח נתונים" אמיתי.

const bounceBar = keyframes`
  0%, 100% { transform: scaleY(0.35); opacity: 0.55; }
  50%      { transform: scaleY(1);    opacity: 1; }
`;

const rippleRing = keyframes`
  0%   { transform: scale(0.6); opacity: 0.7; }
  100% { transform: scale(1.6); opacity: 0; }
`;

interface Props {
  // טקסט אופציונלי מתחת ללודר. אם חסר — הלודר לבד בלי טקסט.
  text?: string;
  // גודל: md לטעינה מלאה, sm לטעינות פנימיות קצרות.
  size?: 'sm' | 'md';
  // צבע נושא (accent) - ברירת מחדל טורקיז (לתובנות).
  accent?: string;
}

export const InsightsLoader = memo(({ text, size = 'md', accent = '#14B8A6' }: Props) => {
  const isSmall = size === 'sm';
  const barGap = isSmall ? 4 : 6;
  const barWidth = isSmall ? 5 : 7;
  const barHeightMax = isSmall ? 26 : 40;

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: isSmall ? 1 : 1.5,
      py: isSmall ? 2.5 : 4,
    }} role="status" aria-live="polite">
      {/* חלל הלודר - bars + ripple ברקע */}
      <Box sx={{
        position: 'relative',
        width: isSmall ? 60 : 90,
        height: barHeightMax + 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* 2 טבעות ריפל ברקע - נותן תחושה של "קריאת נתונים" מתמשכת */}
        {[0, 1].map(i => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: barHeightMax + 6, height: barHeightMax + 6,
              borderRadius: '50%',
              border: `2px solid ${accent}`,
              animation: `${rippleRing} 1.8s cubic-bezier(0, 0.2, 0.8, 1) infinite`,
              animationDelay: `${i * 0.9}s`,
            }}
          />
        ))}

        {/* עמודות מדורגות - 5 ברים שמטפסים ויורדים כמו גרף חי */}
        <Box sx={{
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: `${barGap}px`,
          height: barHeightMax,
        }}>
          {[0, 1, 2, 3, 4].map(i => (
            <Box
              key={i}
              sx={{
                width: barWidth,
                height: barHeightMax,
                borderRadius: `${barWidth}px`,
                background: `linear-gradient(180deg, ${accent}, ${accent}CC)`,
                transformOrigin: 'center',
                animation: `${bounceBar} 1s ease-in-out infinite`,
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </Box>
      </Box>

      {text && (
        <Typography sx={{
          fontSize: isSmall ? 11.5 : 13,
          color: 'text.secondary',
          fontWeight: 500,
          mt: 0.5,
        }}>
          {text}
        </Typography>
      )}
    </Box>
  );
});

InsightsLoader.displayName = 'InsightsLoader';
