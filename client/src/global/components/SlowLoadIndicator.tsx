import { useEffect, useState } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

interface Props {
  active: boolean;
  delayMs?: number;
  message?: string;
}

// ===== אנימציות מותאמות smart-basket =====
// fadeIn מהיר - 0.2s במקום 0.4s, מתאים גם להופעה לשבריר שנייה
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;
// פעימה של הסלסילה הראשית - גרף סינוס נקי
const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
`;
// סיבוב של "פירות" סביב הסלסילה - מעגל אמיתי, נראה כמו סטליט שמסתובב
const orbit = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;
// פס התקדמות אינסופי בסגנון iOS / Material - גל שעובר משמאל לימין
const progressWave = keyframes`
  0% { left: -35%; width: 35%; }
  60% { left: 100%; width: 90%; }
  100% { left: 100%; width: 0%; }
`;

// ===== SlowLoadIndicator - חיווי טעינה custom של smart-basket =====
// מציג עיגול טורקיז-גרדיאנט עם אייקון סלסילה מנופץ ושני "פירות" שמסתובבים
// סביבו במסלול עגול. עיצוב ייחודי: לא emojis, לא ספינר MUI סטנדרטי, אלא
// אנימציה שבנינו ב-CSS pure. תואם הופעה של שבריר שנייה (fade-in 0.2s).
export const SlowLoadIndicator = ({ active, delayMs = 600, message = 'מסנכרן נתונים…' }: Props) => {
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
      animation: `${fadeIn} 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)`,
      pointerEvents: 'none',
      maxWidth: 280,
      width: 'auto',
    }}>
      <Box sx={{
        // glassmorphism מוקפד עם גרדיאנט עדין של ה-brand color
        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,253,250,0.95) 100%)',
        border: '1px solid rgba(20,184,166,0.25)',
        borderRadius: '20px',
        boxShadow: [
          'inset 0 1px 0 rgba(255,255,255,0.7)',
          '0 4px 14px rgba(20,184,166,0.18)',
          '0 16px 40px rgba(15,118,110,0.12)',
        ].join(', '),
        backdropFilter: 'blur(16px)',
        px: 2.25, py: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}>
        {/* ===== הלוגו האנימטיבי - SVG-style טהור עם CSS ===== */}
        <Box sx={{
          position: 'relative',
          width: 44, height: 44,
          flexShrink: 0,
        }}>
          {/* מסלול חיצוני עדין (מסמן את האורבית) */}
          <Box sx={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            border: '1px dashed rgba(20,184,166,0.25)',
          }} />

          {/* "פרי" 1 שמסתובב - turquoise primary */}
          <Box sx={{
            position: 'absolute', inset: 0,
            animation: `${orbit} 1.8s linear infinite`,
          }}>
            <Box sx={{
              position: 'absolute',
              top: -3, left: '50%',
              transform: 'translateX(-50%)',
              width: 8, height: 8,
              borderRadius: '50%',
              backgroundImage: 'linear-gradient(135deg, #2DD4BF, #14B8A6)',
              boxShadow: '0 2px 6px rgba(20,184,166,0.5)',
            }} />
          </Box>

          {/* "פרי" 2 שמסתובב נגדית - turquoise secondary, מסלול הפוך */}
          <Box sx={{
            position: 'absolute', inset: 0,
            animation: `${orbit} 2.4s linear infinite reverse`,
          }}>
            <Box sx={{
              position: 'absolute',
              bottom: -3, left: '50%',
              transform: 'translateX(-50%)',
              width: 6, height: 6,
              borderRadius: '50%',
              backgroundImage: 'linear-gradient(135deg, #5EEAD4, #2DD4BF)',
              boxShadow: '0 2px 4px rgba(45,212,191,0.5)',
            }} />
          </Box>

          {/* הסלסילה במרכז - עיגול גרדיאנט שנושם */}
          <Box sx={{
            position: 'absolute',
            inset: 8,
            borderRadius: '50%',
            backgroundImage: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 60%, #0F766E 100%)',
            boxShadow: [
              'inset 0 1px 0 rgba(255,255,255,0.3)',
              '0 4px 10px rgba(20,184,166,0.4)',
            ].join(', '),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: `${breathe} 1.6s ease-in-out infinite`,
          }}>
            {/* SVG של סלסילה - לא emoji */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 7h14l-1.5 9.5a2 2 0 0 1-2 1.5h-7a2 2 0 0 1-2-1.5L5 7z"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 7l1.5-3a1.5 1.5 0 0 1 1.4-1h.2a1.5 1.5 0 0 1 1.4 1L15 7"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </Box>
        </Box>

        {/* ===== טקסט ===== */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{
            fontSize: 13.5, fontWeight: 800, color: '#0F766E',
            lineHeight: 1.2, letterSpacing: -0.1,
          }}>
            {message}
          </Typography>
          {/* פס התקדמות אינסופי - גל שעובר */}
          <Box sx={{
            mt: 0.7,
            position: 'relative',
            height: 3,
            borderRadius: '2px',
            bgcolor: 'rgba(20,184,166,0.12)',
            overflow: 'hidden',
          }}>
            <Box sx={{
              position: 'absolute',
              top: 0, height: '100%',
              borderRadius: '2px',
              backgroundImage: 'linear-gradient(90deg, #14B8A6, #2DD4BF, #14B8A6)',
              animation: `${progressWave} 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
            }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
