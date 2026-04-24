import { memo } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

// לודר תובנות: 3 נקודות טורקיז שזוחלות בגל אחד-אחרי-השני.
// גודל קטן, ברור, מאוד קריא, קלאסי ומוכר כאינדיקציה של "רגע, טוען".
const dotWave = keyframes`
  0%, 80%, 100% { transform: translateY(0) scale(0.8); opacity: 0.5; }
  40%           { transform: translateY(-10px) scale(1); opacity: 1; }
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
  const dotSize = isSmall ? 8 : 12;
  const gap = isSmall ? 6 : 8;

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: isSmall ? 1.25 : 1.75,
      py: isSmall ? 3 : 5,
    }} role="status" aria-live="polite" aria-label={text || 'טוען'}>
      {/* 3 נקודות מדורגות — אנימציה קלאסית של wave */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: `${gap}px`,
        height: dotSize * 2,
      }}>
        {[0, 1, 2].map(i => (
          <Box
            key={i}
            sx={{
              width: dotSize, height: dotSize,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
              boxShadow: `0 2px 8px ${accent}55`,
              animation: `${dotWave} 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </Box>

      {text && (
        <Typography sx={{
          fontSize: isSmall ? 12 : 13.5,
          color: 'text.secondary',
          fontWeight: 600,
          letterSpacing: 0.2,
        }}>
          {text}
        </Typography>
      )}
    </Box>
  );
});

InsightsLoader.displayName = 'InsightsLoader';
