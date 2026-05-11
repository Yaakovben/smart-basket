/**
 * PulseLoader - חיווי טעינה אחיד לכל האפליקציה.
 *
 * הקונספט: כרטיס לבן אלגנטי עם אייקון, טקסט וגלי קול עדינים.
 * מופיע בכל מקום שצריך טעינה (חוץ מה-splash הירוק הראשוני).
 *
 * 3 גדלים:
 *   sm  - inline בתוך באנר/שורה (compact)
 *   md  - לטעינה בתוך כרטיס/מודאל (ברירת מחדל)
 *   lg  - לטעינה מרכזית של דף שלם (impressive, ממרכז)
 *
 * fullScreen=true מציג overlay על רקע ירוק כמו ה-splash (לעדכון גרסה).
 */

import { Box, Typography, keyframes } from '@mui/material';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';

const waveBar = keyframes`
  0%, 100% { transform: scaleY(0.35); opacity: 0.55; }
  50%      { transform: scaleY(1); opacity: 1; }
`;

const iconBreathe = keyframes`
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.08); }
`;

const cardEnter = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

type Size = 'sm' | 'md' | 'lg';

interface PulseLoaderProps {
  size?: Size;
  color?: string;
  label?: string;
  fullScreen?: boolean;
  icon?: React.ReactNode;          // אייקון מותאם (ברירת מחדל: סל קניות)
}

const SIZES: Record<Size, {
  iconBox: number;
  iconFont: number;
  fontSize: number;
  barHeight: number;
  barWidth: number;
  barGap: number;
  cardPx: number;
  cardPy: number;
  cardRadius: number;
}> = {
  sm: { iconBox: 32, iconFont: 18, fontSize: 12.5, barHeight: 12, barWidth: 3, barGap: 3, cardPx: 1.5, cardPy: 1.25, cardRadius: 12 },
  md: { iconBox: 44, iconFont: 24, fontSize: 14, barHeight: 18, barWidth: 4, barGap: 4, cardPx: 2.25, cardPy: 1.75, cardRadius: 16 },
  lg: { iconBox: 64, iconFont: 32, fontSize: 16, barHeight: 26, barWidth: 5, barGap: 5, cardPx: 3, cardPy: 2.5, cardRadius: 22 },
};

export const PulseLoader = ({
  size = 'md',
  color = '#14B8A6',
  label,
  fullScreen,
  icon,
}: PulseLoaderProps) => {
  const s = SIZES[size];

  const card = (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center',
      gap: size === 'lg' ? 2.25 : size === 'md' ? 1.75 : 1.25,
      px: s.cardPx, py: s.cardPy,
      borderRadius: `${s.cardRadius}px`,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,255,255,0.88))',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: `1px solid ${color}26`,
      boxShadow: `0 8px 28px ${color}22, 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)`,
      animation: `${cardEnter} 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)`,
      maxWidth: '92vw',
    }}>
      {/* אייקון בריבוע מעוגל עם רקע גרדיאנט - הברנדינג של הכרטיס */}
      <Box sx={{
        flexShrink: 0,
        width: s.iconBox, height: s.iconBox,
        borderRadius: `${s.iconBox * 0.28}px`,
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white',
        boxShadow: `0 4px 12px ${color}40, inset 0 1px 0 rgba(255,255,255,0.25)`,
        animation: `${iconBreathe} 2.4s ease-in-out infinite`,
      }}>
        {icon || <ShoppingBasketIcon sx={{ fontSize: s.iconFont }} />}
      </Box>

      {/* תוכן: טקסט + גלי טעינה */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: size === 'sm' ? 0.5 : 0.75, minWidth: 0 }}>
        {label && (
          <Typography sx={{
            fontSize: s.fontSize,
            fontWeight: 800,
            color: 'text.primary',
            letterSpacing: 0.2,
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {label}
          </Typography>
        )}
        {/* גלי קול - 5 פסים שזזים בעדינות */}
        <Box sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: `${s.barGap}px`,
          height: s.barHeight,
        }}>
          {[0, 1, 2, 3, 4].map(i => (
            <Box
              key={i}
              sx={{
                width: s.barWidth,
                height: '100%',
                borderRadius: s.barWidth / 2,
                background: `linear-gradient(180deg, ${color}, ${color}99)`,
                transformOrigin: 'bottom',
                animation: `${waveBar} 1.1s ease-in-out ${i * 0.11}s infinite`,
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );

  if (!fullScreen) return card;

  return (
    <Box sx={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center top, #2DD4BF 0%, #14B8A6 50%, #0D9488 100%)',
      zIndex: 9999,
      px: 2,
    }}>
      {card}
    </Box>
  );
};

PulseLoader.displayName = 'PulseLoader';
