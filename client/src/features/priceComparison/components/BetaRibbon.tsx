import { memo } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

const shimmer = keyframes`
  0% { background-position: -150% 0; }
  60%, 100% { background-position: 150% 0; }
`;

interface Props {
  // באיזו פינה למקם את הסרט
  corner?: 'top-left' | 'top-right';
}

// סרט BETA אלכסוני שיושב בפינה של הקונטיינר (חייב position: relative על ההורה).
// הסגנון: ריבון מודרני עם gradient טורקיז וטקסט BETA מודגש.
export const BetaRibbon = memo(({ corner = 'top-left' }: Props) => {
  const isLeft = corner === 'top-left';

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        [isLeft ? 'left' : 'right']: 0,
        width: 110,
        height: 110,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 3,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: isLeft ? 22 : 22,
          [isLeft ? 'left' : 'right']: -32,
          width: 160,
          py: 0.6,
          textAlign: 'center',
          transform: isLeft ? 'rotate(-38deg)' : 'rotate(38deg)',
          transformOrigin: 'center',
          background: 'linear-gradient(90deg, #0D9488 0%, #14B8A6 35%, #2DD4BF 65%, #5EEAD4 100%)',
          boxShadow: '0 3px 12px rgba(20,184,166,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
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
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), transparent)',
            pointerEvents: 'none',
          },
        }}
      >
        <Typography
          sx={{
            position: 'relative',
            fontSize: 11,
            fontWeight: 900,
            color: 'white',
            letterSpacing: 3,
            textShadow: '0 1px 2px rgba(0,0,0,0.25)',
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
