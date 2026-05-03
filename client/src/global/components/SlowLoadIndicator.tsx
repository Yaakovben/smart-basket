import { useEffect, useState } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

interface Props {
  active: boolean;
  delayMs?: number;
  message?: string;
}

// אנימציות
const walk = keyframes`
  0% { transform: translateX(-40px); }
  50% { transform: translateX(40px); }
  100% { transform: translateX(-40px); }
`;
const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;
const sparkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.1); }
`;

// חיווי טעינה אסתטי שמופיע רק כשהטעינה לוקחת מעל 4 שניות.
// מציג איש-עם-עגלה הולך לכיוון השרת (סלסילה) ומחזיר מידע - חזותית
// "מי-מביא-את-המידע" שעוזר ללקוח להבין למה זה לוקח זמן.
export const SlowLoadIndicator = ({ active, delayMs = 4000, message = 'אוסף מחירים מכל הסניפים...' }: Props) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) { setShow(false); return; }
    const t = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(t);
  }, [active, delayMs]);

  if (!show) return null;

  return (
    <Box sx={{
      position: 'fixed',
      bottom: 'calc(env(safe-area-inset-bottom) + 100px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1500,
      animation: `${fadeIn} 0.4s ease-out`,
      pointerEvents: 'none',
      maxWidth: 320,
      width: '90%',
    }}>
      <Box sx={{
        bgcolor: 'rgba(20,184,166,0.95)',
        color: 'white',
        borderRadius: 3,
        boxShadow: '0 12px 32px rgba(20,184,166,0.35), 0 4px 12px rgba(0,0,0,0.15)',
        p: 2,
        backdropFilter: 'blur(12px)',
      }}>
        {/* האיש שהולך עם העגלה */}
        <Box sx={{
          position: 'relative',
          height: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1,
          overflow: 'hidden',
        }}>
          {/* קווי תנועה דמיוניים מאחור */}
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: 0, right: 0,
            height: 2,
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)',
            transform: 'translateY(-50%)',
          }} />
          {/* האיש + העגלה */}
          <Box sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: 32,
            animation: `${walk} 2.6s ease-in-out infinite`,
          }}>
            <Box sx={{ animation: `${bounce} 0.5s ease-in-out infinite` }}>🛒</Box>
            <Box sx={{ animation: `${bounce} 0.5s ease-in-out infinite`, animationDelay: '0.05s' }}>🚶</Box>
          </Box>
          {/* "מקור" המידע - חנות בקצה השני */}
          <Box sx={{ position: 'absolute', right: 12, fontSize: 24, animation: `${sparkle} 1.4s ease-in-out infinite` }}>🏪</Box>
          <Box sx={{ position: 'absolute', left: 12, fontSize: 24, opacity: 0.8 }}>🏠</Box>
        </Box>

        {/* טקסט */}
        <Typography sx={{ fontSize: 14, fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>
          {message}
        </Typography>
        <Typography sx={{ fontSize: 11, opacity: 0.85, textAlign: 'center', mt: 0.4 }}>
          רגע, השרת מאחזר עבורך נתונים טריים
        </Typography>

        {/* פס התקדמות עדין */}
        <Box sx={{
          mt: 1.5,
          height: 3,
          borderRadius: 1.5,
          bgcolor: 'rgba(255,255,255,0.2)',
          overflow: 'hidden',
        }}>
          <Box sx={{
            height: '100%',
            width: '40%',
            bgcolor: 'white',
            borderRadius: 1.5,
            animation: `${walk} 1.6s ease-in-out infinite`,
          }} />
        </Box>
      </Box>
    </Box>
  );
};
