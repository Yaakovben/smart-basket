import { memo } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

// אנימציות — שימר עובר על פני התג וצף קל
const shimmer = keyframes`
  0% { background-position: -120% 0; }
  60% { background-position: 180% 0; }
  100% { background-position: 180% 0; }
`;

const floatBubble = keyframes`
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.55; }
  50% { transform: translateY(-3px) scale(1.1); opacity: 0.9; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 2px 10px rgba(20,184,166,0.35), inset 0 1px 0 rgba(255,255,255,0.3); }
  50% { box-shadow: 0 4px 18px rgba(20,184,166,0.55), inset 0 1px 0 rgba(255,255,255,0.4); }
`;

interface Props {
  size?: 'sm' | 'md';
}

// תג BETA יצירתי - צורת טבלית מבחן עם שימר זהב ובועות צפות
export const BetaBadge = memo(({ size = 'md' }: Props) => {
  const isSm = size === 'sm';
  const fontSize = isSm ? 9 : 10.5;
  const py = isSm ? 0.3 : 0.4;
  const px = isSm ? 1 : 1.25;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px,
        py,
        borderRadius: '999px',
        background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 40%, #2DD4BF 70%, #5EEAD4 100%)',
        overflow: 'hidden',
        animation: `${pulseGlow} 2.8s ease-in-out infinite`,
        // קו עליון מבריק — אפקט זכוכית
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '45%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.28), transparent)',
          pointerEvents: 'none',
        },
        // שימר שחולף
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)',
          backgroundSize: '220% 100%',
          animation: `${shimmer} 3.6s ease-in-out infinite`,
          pointerEvents: 'none',
        },
      }}
    >
      {/* אייקון טבלית מבחן עם בועות */}
      <Box sx={{ position: 'relative', fontSize: fontSize + 2, lineHeight: 1, zIndex: 1 }}>
        <span>🧪</span>
        {/* בועה זעירה צפה */}
        <Box
          sx={{
            position: 'absolute',
            top: -2, right: -3,
            width: 3, height: 3, borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.85)',
            animation: `${floatBubble} 1.8s ease-in-out infinite`,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 1, right: -1,
            width: 2, height: 2, borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.7)',
            animation: `${floatBubble} 2.2s ease-in-out infinite 0.3s`,
          }}
        />
      </Box>
      <Typography
        sx={{
          fontSize,
          fontWeight: 900,
          color: 'white',
          letterSpacing: 1.5,
          position: 'relative',
          zIndex: 1,
          textShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }}
      >
        BETA
      </Typography>
    </Box>
  );
});

BetaBadge.displayName = 'BetaBadge';
