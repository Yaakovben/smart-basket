import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { fadeIn } from './animations';

// ===== Month Recap Card - "החודש שלך" בסגנון Spotify Wrapped =====
// כרטיס גדול שמתחלף אוטומטית בין 4-5 עובדות מרכזיות על החודש האחרון.
// גרדיאנט מאמיר, אמוג'י ענק, מספר אדיר. כל סלייד מקבל 4 שניות.
type RecapSlide = { emoji: string; headline: React.ReactNode; sub: string; gradient: string };

export const MonthRecapCard = ({ slides }: {
  slides: RecapSlide[]; isDark: boolean;
}) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => setIdx(i => (i + 1) % slides.length), 4000);
    return () => window.clearInterval(t);
  }, [slides.length]);

  if (!slides || slides.length === 0) return null;
  const s = slides[idx];

  return (
    <Box sx={{
      position: 'relative', mb: 2, p: 2.25, borderRadius: '20px',
      background: s.gradient, color: 'white',
      boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
      overflow: 'hidden', minHeight: 130,
      transition: 'background 0.6s ease',
      animation: `${fadeIn} 0.5s ease both`,
    }}>
      {/* רקעים דקורטיביים */}
      <Box sx={{
        position: 'absolute', top: -50, right: -40, width: 170, height: 170,
        borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.13)',
        pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', bottom: -60, left: -30, width: 150, height: 150,
        borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.08)',
        pointerEvents: 'none',
      }} />

      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography sx={{
          fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, opacity: 0.92, textTransform: 'uppercase', mb: 0.5,
        }}>
          ✨ החודש שלך
        </Typography>
        <Box key={idx} sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          animation: `${fadeIn} 0.45s ease both`,
        }}>
          <Typography sx={{
            fontSize: 56, lineHeight: 1, flexShrink: 0,
            textShadow: '0 2px 8px rgba(0,0,0,0.18)',
            animation: 'recapPop 0.7s ease both',
            '@keyframes recapPop': {
              from: { transform: 'scale(0.6) rotate(-10deg)', opacity: 0 },
              to: { transform: 'scale(1) rotate(0deg)', opacity: 1 },
            },
          }}>
            {s.emoji}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{
              fontSize: 22, fontWeight: 900, lineHeight: 1.15, letterSpacing: -0.4,
              textShadow: '0 1px 4px rgba(0,0,0,0.18)',
              '& b': { fontWeight: 900, fontSize: 26 },
            }}>
              {s.headline}
            </Typography>
            <Typography sx={{ fontSize: 12, opacity: 0.92, mt: 0.5, lineHeight: 1.4 }}>
              {s.sub}
            </Typography>
          </Box>
        </Box>
        {/* dots */}
        {slides.length > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.4, mt: 1.25 }}>
            {slides.map((_, i) => (
              <Box key={i}
                onClick={() => setIdx(i)}
                sx={{
                  width: i === idx ? 22 : 6, height: 5, borderRadius: '3px',
                  bgcolor: i === idx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                  cursor: 'pointer', transition: 'width 0.3s ease',
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};
