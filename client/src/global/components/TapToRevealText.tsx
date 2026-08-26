import { useRef, useState } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

interface TapToRevealTextProps {
  text: string;
  sx?: SxProps<Theme>;
}

// טקסט מקוצץ (ellipsis) כברירת מחדל; בלחיצה - רק אם הוא באמת חתוך
// (scrollWidth > clientWidth) - מחליק אותו אופקית לחשוף את החלק שנחתך,
// ואז חוזר למצב מקוצץ. כיוון וגודל התזוזה נגזרים ב-runtime (כיוון לפי
// direction בפועל של האלמנט - RTL/LTR; מרחק לפי כמות ה-overflow בפועל)
// ומועברים כ-CSS custom property שה-keyframes קוראים ממנה.
export const TapToRevealText = ({ text, sx }: TapToRevealTextProps) => {
  const ref = useRef<HTMLElement>(null);
  const [revealing, setRevealing] = useState(false);

  const handleClick = () => {
    if (revealing) return;
    const el = ref.current;
    if (!el) return;
    const overflow = el.scrollWidth - el.clientWidth;
    if (overflow <= 0) return;
    const isRtl = getComputedStyle(el).direction === 'rtl';
    el.style.setProperty('--reveal-offset', `${isRtl ? overflow : -overflow}px`);
    setRevealing(true);
  };

  return (
    <Box
      component="span"
      ref={ref}
      onClick={handleClick}
      onAnimationEnd={() => setRevealing(false)}
      sx={{
        display: 'inline-block',
        maxWidth: '100%',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: revealing ? 'clip' : 'ellipsis',
        cursor: 'pointer',
        verticalAlign: 'bottom',
        ...(revealing && { animation: 'tapRevealSlide 2.2s ease-in-out' }),
        '@keyframes tapRevealSlide': {
          '0%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(0)' },
          '55%': { transform: 'translateX(var(--reveal-offset))' },
          '85%': { transform: 'translateX(var(--reveal-offset))' },
          '100%': { transform: 'translateX(0)' },
        },
        ...sx,
      }}
    >
      {text}
    </Box>
  );
};
