import { memo } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

const shimmer = keyframes`
  0% { background-position: -150% 0; }
  60%, 100% { background-position: 150% 0; }
`;

interface Props {
  // באיזה צד פיזי הריבון יופיע. חשוב: RTL של MUI הופך left/right ב-sx,
  // לכן אנחנו משתמשים ב-style ולא ב-sx כדי להבטיח מיקום פיזי מדויק.
  // בעברית (RTL) - "top-left" ייתן ריבון בצד השמאלי הפיזי/ויזואלי.
  corner?: 'top-left' | 'top-right';
  // offset אנכי מראש הקונטיינר - מאפשר למקם את הסרט נמוך יותר כדי לא לכסות כותרת
  offsetTop?: number;
  // גודל הריבון (בא ליצור נוכחות גדולה יותר כשצריך)
  size?: 'md' | 'lg' | 'xl';
}

// סרט BETA אלכסוני גדול בפינה של הקונטיינר (חייב position: relative על ההורה).
// הסגנון: ריבון טורקיז בולט עם גרדיאנט, שימר וצל עמוק.
export const BetaRibbon = memo(({ corner = 'top-left', offsetTop = 0, size = 'lg' }: Props) => {
  const isLeft = corner === 'top-left';
  // מימדי הריבון לפי גודל נבחר - גובה הסרט (padY) הונמך כדי שיהיה דק יותר
  // ולא תופס גובה רב בפינה, תוך שמירה על הרוחב האלכסוני.
  const boxSize = size === 'xl' ? 150 : size === 'lg' ? 125 : 110;
  const innerWidth = size === 'xl' ? 230 : size === 'lg' ? 200 : 160;
  const innerTop = size === 'xl' ? 16 : size === 'lg' ? 14 : 14;
  const innerOffset = size === 'xl' ? -42 : size === 'lg' ? -38 : -32;
  const fontSize = size === 'xl' ? 13 : size === 'lg' ? 11.5 : 10.5;
  const letterSpacing = size === 'xl' ? 3.5 : size === 'lg' ? 3 : 2.5;
  const padY = size === 'xl' ? 0.55 : size === 'lg' ? 0.45 : 0.4;
  const shadowStrength = size === 'xl'
    ? '0 5px 22px rgba(20,184,166,0.6)'
    : size === 'lg'
      ? '0 4px 18px rgba(20,184,166,0.55)'
      : '0 3px 12px rgba(20,184,166,0.45)';

  // מיקום פיזי דרך style prop - עוקף את ה-RTL-flip של MUI sx
  // (בלי זה, בעברית הריבון קופץ לצד ההפוך מהמצופה).
  const outerStyle: React.CSSProperties = {
    position: 'absolute',
    top: offsetTop,
    left: isLeft ? 0 : 'auto',
    right: isLeft ? 'auto' : 0,
    width: boxSize,
    height: boxSize,
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 3,
  };

  const innerStyle: React.CSSProperties = {
    position: 'absolute',
    top: innerTop,
    left: isLeft ? innerOffset : 'auto',
    right: isLeft ? 'auto' : innerOffset,
    width: innerWidth,
    transformOrigin: 'center',
    transform: isLeft ? 'rotate(-38deg)' : 'rotate(38deg)',
  };

  return (
    <Box style={outerStyle}>
      <Box
        style={innerStyle}
        sx={{
          py: padY,
          textAlign: 'center',
          background: 'linear-gradient(90deg, #0D9488 0%, #14B8A6 35%, #2DD4BF 65%, #5EEAD4 100%)',
          boxShadow: `${shadowStrength}, inset 0 1px 0 rgba(255,255,255,0.35)`,
          // שימר חולף
          '&::after': {
            content: '""',
            position: 'absolute', inset: 0,
            background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)',
            backgroundSize: '220% 100%',
            animation: `${shimmer} 3.6s ease-in-out infinite`,
            pointerEvents: 'none',
          },
          // קצוות "מקופלים" שמייצרים אפקט סרט אמיתי
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0, right: 0, bottom: -4,
            height: 4,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)',
            pointerEvents: 'none',
          },
        }}
      >
        <Typography
          sx={{
            position: 'relative',
            fontSize,
            fontWeight: 900,
            color: 'white',
            letterSpacing,
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            zIndex: 1,
          }}
        >
          🧪 BETA
        </Typography>
      </Box>
    </Box>
  );
});

BetaRibbon.displayName = 'BetaRibbon';
