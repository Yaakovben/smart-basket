/**
 * PulseLoader - חיווי טעינה אחיד לכל האפליקציה.
 *
 * הרעיון: 3 פסים אנכיים בגוון הברנד שזזים בגלים עדינים, כמו equalizer
 * או גלי קול. נקי, רגוע, לא צועק, ומיד מובן כאינדיקציה של "עובדים".
 *
 * אותו דפוס בדיוק בכל מקום: splash, עדכון גרסה, טעינת מחירים, טעינת דפים.
 *
 * 3 גדלים:
 *   sm  - inline ליד טקסט (16px height)
 *   md  - בתוך כרטיס (28px height)
 *   lg  - לטעינה מרכזית של דף (48px height)
 */

import { Box, Typography, keyframes } from '@mui/material';

const waveBar = keyframes`
  0%, 100% { transform: scaleY(0.35); opacity: 0.55; }
  50%      { transform: scaleY(1); opacity: 1; }
`;

type Size = 'sm' | 'md' | 'lg';

interface PulseLoaderProps {
  size?: Size;
  color?: string;
  label?: string;
  fullScreen?: boolean;
}

const SIZES: Record<Size, { height: number; width: number; gap: number; bars: number }> = {
  sm: { height: 16, width: 3, gap: 3, bars: 3 },
  md: { height: 28, width: 4, gap: 4, bars: 4 },
  lg: { height: 48, width: 6, gap: 6, bars: 5 },
};

export const PulseLoader = ({
  size = 'md',
  color = '#14B8A6',
  label,
  fullScreen,
}: PulseLoaderProps) => {
  const { height, width, gap, bars } = SIZES[size];

  const inner = (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: size === 'lg' ? 2 : 1.25,
    }}>
      {/* קונטיינר הפסים - יישור לתחתית כך שהאנימציה תיראה שהפסים "גדלים מהבסיס" */}
      <Box sx={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: `${gap}px`,
        height,
      }}>
        {Array.from({ length: bars }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width,
              height: '100%',
              borderRadius: width / 2,
              background: `linear-gradient(180deg, ${color}, ${color}cc)`,
              transformOrigin: 'bottom',
              animation: `${waveBar} 1.1s ease-in-out infinite`,
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </Box>

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
