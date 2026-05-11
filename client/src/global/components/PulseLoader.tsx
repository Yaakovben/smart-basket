/**
 * PulseLoader - חיווי טעינה אחיד לכל האפליקציה.
 *
 * רעיון: 2 טבעות מתפשטות מנקודה מרכזית. אותו דפוס מופיע ב-splash הראשוני,
 * בעדכון גרסה, בטעינת מחירים, בטעינת דפים, ובכל מקום שצריך לסמן 'עובדים'.
 * כך המשתמש לומד את החיווי ויודע מיד מה מתרחש בכל מקום באפליקציה.
 *
 * 3 גדלים:
 *   sm  (24px) - inline, ליד טקסט
 *   md  (48px) - לטעינה דיסקרטית בתוך כרטיס
 *   lg  (96px) - לטעינה מרכזית של דף
 */

import { Box, Typography, keyframes } from '@mui/material';

const ringPulse = keyframes`
  0%   { transform: scale(0.75); opacity: 0; border-width: 2px; }
  15%  { opacity: 0.6; }
  100% { transform: scale(2); opacity: 0; border-width: 0.5px; }
`;

const dotBlink = keyframes`
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.45; }
  40%           { transform: scale(1); opacity: 1; }
`;

type Size = 'sm' | 'md' | 'lg';

interface PulseLoaderProps {
  size?: Size;
  color?: string;            // ברירת מחדל: טורקיז המותג
  label?: string;            // טקסט מתחת לאינדיקטור
  dots?: boolean;            // נקודות מתחת (ברירת מחדל: true ב-md/lg, false ב-sm)
  fullScreen?: boolean;      // מסך מלא עם רקע
}

const SIZES: Record<Size, { box: number; logoSize: number }> = {
  sm: { box: 24, logoSize: 12 },
  md: { box: 48, logoSize: 24 },
  lg: { box: 96, logoSize: 48 },
};

export const PulseLoader = ({
  size = 'md',
  color = '#14B8A6',
  label,
  dots,
  fullScreen,
}: PulseLoaderProps) => {
  const { box, logoSize } = SIZES[size];
  const showDots = dots ?? size !== 'sm';

  const inner = (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: size === 'lg' ? 2 : 1,
    }}>
      {/* קונטיינר הטבעות והלוגו */}
      <Box sx={{
        position: 'relative',
        width: box, height: box,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* 2 טבעות מתפשטות - signature של האפליקציה */}
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `1.5px solid ${color}`,
          animation: `${ringPulse} 2s ease-out infinite`,
        }} />
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `1.5px solid ${color}`,
          animation: `${ringPulse} 2s ease-out 1s infinite`,
        }} />
        {/* נקודה מרכזית - הליבה שממנה הטבעות יוצאות */}
        <Box sx={{
          width: logoSize, height: logoSize, borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 ${size === 'sm' ? 6 : 12}px ${color}55`,
        }} />
      </Box>

      {/* תווית טקסט אופציונלית */}
      {label && (
        <Typography sx={{
          fontSize: size === 'lg' ? 14 : size === 'md' ? 12.5 : 11.5,
          fontWeight: 700,
          color: fullScreen ? 'white' : 'text.secondary',
          letterSpacing: 0.3,
          textAlign: 'center',
        }}>
          {label}
        </Typography>
      )}

      {/* 3 נקודות מקפצות מתחת - חיזוק חזותי לתחושת 'עובדים' */}
      {showDots && (
        <Box sx={{ display: 'flex', gap: 0.6 }}>
          {[0, 1, 2].map(i => (
            <Box key={i} sx={{
              width: size === 'lg' ? 6 : 4, height: size === 'lg' ? 6 : 4,
              borderRadius: '50%',
              bgcolor: fullScreen ? 'rgba(255,255,255,0.85)' : color,
              animation: `${dotBlink} 1.4s ease-in-out ${i * 0.18}s infinite`,
            }} />
          ))}
        </Box>
      )}
    </Box>
  );

  if (!fullScreen) return inner;

  return (
    <Box sx={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center top, #0F766E 0%, #0D9488 45%, #134E4A 100%)',
      zIndex: 9999,
    }}>
      {inner}
    </Box>
  );
};

PulseLoader.displayName = 'PulseLoader';
