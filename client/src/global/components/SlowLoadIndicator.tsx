import { useEffect, useState } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

interface Props {
  active: boolean;
  delayMs?: number;
  message?: string;
  subMessage?: string;
  /**
   * 'modal' - חלון מרכזי גדול עם רקע מטושטש (מתאים לכניסה ראשונית/טעינה ראשונית).
   * 'toast' - בועה קטנה בתחתית-מרכז (מתאים לרענון רקע במסך פעיל כמו תובנות).
   */
  variant?: 'modal' | 'toast';
}

// ===== אנימציות מתואמות =====
const fadeBackdrop = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;
const popIn = keyframes`
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
  60% { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
  100% { transform: translate(-50%, -50%) scale(1); }
`;
const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;
const orbit = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;
const orbitReverse = keyframes`
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
`;
const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(20,184,166,0.4), 0 12px 32px rgba(20,184,166,0.3); }
  50% { box-shadow: 0 0 0 18px rgba(20,184,166,0), 0 12px 32px rgba(20,184,166,0.45); }
`;
const dotPulse = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1); }
`;
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;
const fly = keyframes`
  0% { transform: translateX(-130%) rotate(-8deg); opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { transform: translateX(130%) rotate(8deg); opacity: 0; }
`;

// SlowLoadIndicator - חיווי טעינה אסתטי וגדול, מרכזי במסך עם backdrop blur עדין.
// מציג עיגול-לוגו עם הילה זוהרת, סלסילה במרכז, פירות קטנים מסתובבים בשני
// כיוונים, וטקסט ראשי+משני. שורת נקודות פעימות מתחת לסיום.
export const SlowLoadIndicator = ({
  active,
  delayMs = 600,
  message = 'אוסף מחירים מכל הסניפים',
  subMessage = 'רגע, מאחזר נתונים טריים מהשרת',
  variant = 'modal',
}: Props) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) { setShow(false); return; }
    const t = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(t);
  }, [active, delayMs]);

  if (!show) return null;

  const isToast = variant === 'toast';

  return (
    <>
      {/* רקע מטושטש - רק במצב modal */}
      {!isToast && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 1499,
          bgcolor: 'rgba(15,23,42,0.18)',
          backdropFilter: 'blur(2px)',
          animation: `${fadeBackdrop} 0.25s ease-out`,
          pointerEvents: 'none',
        }} />
      )}

      {/* כרטיס - מרכז המסך (modal) או בתחתית (toast) */}
      <Box sx={{
        position: 'fixed',
        ...(isToast ? {
          bottom: 'calc(env(safe-area-inset-bottom) + 96px)',
          left: '50%',
          transform: 'translateX(-50%)',
        } : {
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }),
        zIndex: 1500,
        animation: `${popIn} 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)`,
        pointerEvents: 'none',
        width: isToast ? 'min(280px, 86vw)' : 'min(320px, 88vw)',
      }}>
        <Box sx={{
          position: 'relative',
          background: 'linear-gradient(145deg, #FFFFFF 0%, #F0FDFA 100%)',
          borderRadius: isToast ? '20px' : '28px',
          boxShadow: [
            '0 1px 0 rgba(255,255,255,0.9) inset',
            '0 0 0 1px rgba(20,184,166,0.18)',
            isToast ? '0 12px 32px rgba(15,118,110,0.15)' : '0 22px 60px rgba(15,118,110,0.18)',
            '0 6px 16px rgba(20,184,166,0.12)',
          ].join(', '),
          px: isToast ? 2 : 3,
          py: isToast ? 1.5 : 3.5,
          textAlign: isToast ? 'right' : 'center',
          overflow: 'hidden',
          display: isToast ? 'flex' : 'block',
          alignItems: isToast ? 'center' : 'stretch',
          gap: isToast ? 1.5 : 0,
        }}>
          {/* פס shimmer עדין מעל הכרטיס */}
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, height: isToast ? 2 : 3,
            background: 'linear-gradient(90deg, transparent, #5EEAD4, #14B8A6, #5EEAD4, transparent)',
            backgroundSize: '200% 100%',
            animation: `${shimmer} 2s linear infinite`,
          }} />

          {/* ===== הלוגו האנימטיבי ===== */}
          <Box sx={{
            position: 'relative',
            width: isToast ? 44 : 96,
            height: isToast ? 44 : 96,
            mx: isToast ? 0 : 'auto',
            mb: isToast ? 0 : 2,
            flexShrink: 0,
          }}>
            {/* טבעת חיצונית עדינה */}
            <Box sx={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              border: '1.5px dashed rgba(20,184,166,0.3)',
              animation: `${orbit} 12s linear infinite`,
            }} />

            {/* פרי 1 - מסלול חיצוני, נקודה גדולה טורקיז */}
            <Box sx={{
              position: 'absolute', inset: 4,
              animation: `${orbit} 2s linear infinite`,
            }}>
              <Box sx={{
                position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
                width: 12, height: 12, borderRadius: '50%',
                background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
                boxShadow: '0 3px 8px rgba(20,184,166,0.5)',
              }} />
            </Box>

            {/* פרי 2 - מסלול הפוך, נקודה ירוק-טורקיז */}
            <Box sx={{
              position: 'absolute', inset: 4,
              animation: `${orbitReverse} 2.6s linear infinite`,
            }}>
              <Box sx={{
                position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
                width: 9, height: 9, borderRadius: '50%',
                background: 'linear-gradient(135deg, #5EEAD4 0%, #2DD4BF 100%)',
                boxShadow: '0 2px 6px rgba(45,212,191,0.5)',
              }} />
            </Box>

            {/* פרי 3 קטן - על המסלול הפנימי */}
            <Box sx={{
              position: 'absolute', inset: 12,
              animation: `${orbitReverse} 1.8s linear infinite`,
            }}>
              <Box sx={{
                position: 'absolute', top: -1, right: '50%', transform: 'translateX(50%)',
                width: 6, height: 6, borderRadius: '50%',
                bgcolor: '#0D9488',
                boxShadow: '0 1px 4px rgba(13,148,136,0.5)',
              }} />
            </Box>

            {/* הסלסילה - עיגול גדול מרכזי עם הילה */}
            <Box sx={{
              position: 'absolute', inset: 18,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 55%, #0F766E 100%)',
              animation: `${breathe} 2s ease-in-out infinite, ${glowPulse} 2s ease-in-out infinite`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* SVG סלסילה */}
              <svg width={isToast ? 16 : 32} height={isToast ? 16 : 32} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>
                <path
                  d="M5 8h14l-1.7 9.4a2.4 2.4 0 0 1-2.4 2H9.1a2.4 2.4 0 0 1-2.4-2L5 8z"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
                <path
                  d="M9 8l1.6-3.2A1.6 1.6 0 0 1 12 4h0a1.6 1.6 0 0 1 1.4.8L15 8"
                  stroke="white" strokeWidth="2" strokeLinecap="round"
                />
                {/* "פירות" בתוך הסלסילה */}
                <circle cx="9.5" cy="13" r="0.8" fill="white" opacity="0.85" />
                <circle cx="14.5" cy="14" r="0.8" fill="white" opacity="0.85" />
                <circle cx="12" cy="16" r="0.8" fill="white" opacity="0.85" />
              </svg>
            </Box>
          </Box>

          {/* ===== טקסט ===== */}
          <Box sx={{ flex: isToast ? 1 : 'none', minWidth: 0 }}>
            <Typography sx={{
              fontSize: isToast ? 13.5 : 17,
              fontWeight: 800,
              color: '#0F766E',
              letterSpacing: -0.2,
              lineHeight: 1.3,
              mb: isToast ? 0.25 : 0.5,
            }}>
              {message}
            </Typography>
            {!isToast && (
              <Typography sx={{
                fontSize: 12.5, fontWeight: 500,
                color: 'rgba(15,118,110,0.65)',
                lineHeight: 1.4,
              }}>
                {subMessage}
              </Typography>
            )}

            {/* 3 נקודות פעימה - בטוסט מתחת לטקסט במאוזן */}
            <Box sx={{
              display: 'inline-flex', gap: isToast ? 0.5 : 0.75,
              mt: isToast ? 0.5 : 1.75,
              justifyContent: 'center', alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <Box key={i} sx={{
                  width: isToast ? 5 : 7, height: isToast ? 5 : 7,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2DD4BF, #14B8A6)',
                  animation: `${dotPulse} 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 0.18}s`,
                }} />
              ))}
            </Box>
          </Box>

          {/* "עגלה טסה" - רק במצב modal (toast קטן יותר מכדי להיות רלוונטי) */}
          {!isToast && (
            <Box sx={{
              position: 'relative',
              height: 18, mt: 1.5, overflow: 'hidden',
              borderRadius: 1.5,
              opacity: 0.9,
            }}>
              <Box sx={{
                position: 'absolute', top: '50%', left: 0,
                transform: 'translateY(-50%)',
                fontSize: 14,
                animation: `${fly} 3s ease-in-out infinite`,
              }}>
                🛒
              </Box>
              <Box sx={{
                position: 'absolute', top: '50%', left: 0, right: 0,
                transform: 'translateY(-50%)',
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(20,184,166,0.15), transparent)',
              }} />
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
};
