/**
 * TopProgressBar - פס דק בראש המסך לסימון טעינה ברקע.
 *
 * דפוס סטנדרטי מודרני (YouTube, GitHub, Linear, Vercel) - מודיע למשתמש
 * שמשהו עובד ברקע בלי להפריע לתוכן הקיים.
 *
 * שימוש:
 *   <TopProgressBar active={isLoading} />
 *   <TopProgressBar active={isLoading} label="מסנכרן..." />
 */

import { useEffect, useState } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

const slidePrimary = keyframes`
  0%   { transform: translateX(-120%); }
  100% { transform: translateX(240%); }
`;

const slideSecondary = keyframes`
  0%   { transform: translateX(-160%); }
  100% { transform: translateX(280%); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.85; }
  50%      { opacity: 1; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -6px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
`;

const fadeOut = keyframes`
  from { opacity: 1; transform: translate(-50%, 0); }
  to   { opacity: 0; transform: translate(-50%, -6px); }
`;

interface Props {
  active: boolean;
  color?: string;
  label?: string;
}

export const TopProgressBar = ({ active, color = '#14B8A6', label }: Props) => {
  // שמירה על הרכיב ב-DOM עד שאנימציית היציאה מסתיימת
  const [visible, setVisible] = useState(active);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (active) {
      setExiting(false);
      setVisible(true);
    } else if (visible) {
      setExiting(true);
      const t = setTimeout(() => setVisible(false), 320);
      return () => clearTimeout(t);
    }
  }, [active, visible]);

  if (!visible) return null;

  return (
    <Box sx={{
      // עטיפת ה-pill בכרטיס משלו - מבודד ויזואלית מהתוכן מתחת,
      // כדי שלא ייראה כאילו הוא צמוד לבורר הרשימות / שורת הסינון.
      position: 'fixed',
      top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      pointerEvents: 'none',
      animation: `${exiting ? fadeOut : fadeIn} 0.32s ease-out forwards`,
    }}>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
        // הכרטיס עצמו - רקע לבן/כהה עם blur, מסגרת עדינה, צל ברור.
        px: 1.75, py: 1.1,
        borderRadius: '999px',
        bgcolor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.06)',
        minWidth: 200,
      }}>
        <Box sx={{
          position: 'relative',
          width: 160,
          height: 5,
          bgcolor: `${color}1A`,
          borderRadius: 999,
          overflow: 'hidden',
          animation: `${pulse} 2s ease-in-out infinite`,
        }}>
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '45%',
            height: '100%',
            borderRadius: 999,
            background: `linear-gradient(90deg, transparent, ${color}, #5EEAD4, ${color}, transparent)`,
            boxShadow: `0 0 14px ${color}, 0 0 6px ${color}`,
            animation: `${slidePrimary} 1.4s ease-in-out infinite`,
          }} />
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '30%',
            height: '100%',
            borderRadius: 999,
            background: `linear-gradient(90deg, transparent, #5EEAD4, transparent)`,
            boxShadow: `0 0 10px #5EEAD4`,
            opacity: 0.75,
            animation: `${slideSecondary} 2.1s ease-in-out infinite`,
            animationDelay: '0.4s',
          }} />
        </Box>
        {label && (
          <Typography sx={{
            fontSize: 11.5,
            fontWeight: 700,
            color: '#0D9488',
            letterSpacing: 0.2,
            whiteSpace: 'nowrap',
          }}>
            {label}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

TopProgressBar.displayName = 'TopProgressBar';
