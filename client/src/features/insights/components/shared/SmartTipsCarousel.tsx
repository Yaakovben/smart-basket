import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { fadeIn } from './animations';

// ===== Smart Tips Carousel - תובנות חכמות מתחלפות =====
// מציג תובנה אחת בכל פעם, מתחלף אוטומטית כל 5 שניות. אפשר ללחוץ
// על נקודות ההתקדמות כדי לדלג. רכיב ויזואלי שמרגיש "חי" ומעודד הסתכלות.
export const SmartTipsCarousel = ({ tips, isDark, t }: {
  tips: string[]; isDark: boolean; t: (key: string) => string;
}) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (tips.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setIdx(i => (i + 1) % tips.length);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [tips.length]);

  if (!tips || tips.length === 0) return null;

  return (
    <Box sx={{
      mb: 2, p: 1.5, borderRadius: '14px',
      background: isDark
        ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(20,184,166,0.08))'
        : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(20,184,166,0.05))',
      border: '1px solid',
      borderColor: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.22)',
      animation: `${fadeIn} 0.45s ease both`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.8 }}>
        <Typography sx={{ fontSize: 18, lineHeight: 1, mt: 0.15 }}>💡</Typography>
        <Box sx={{ flex: 1, minHeight: 36 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.disabled', letterSpacing: 0.5, mb: 0.35 }}>
            {t('smartTipLabel')}
          </Typography>
          <Typography
            key={idx}
            sx={{
              fontSize: 12.5, fontWeight: 600, color: 'text.primary',
              lineHeight: 1.5,
              animation: `${fadeIn} 0.4s ease both`,
            }}
          >
            {tips[idx]}
          </Typography>
        </Box>
      </Box>
      {/* נקודות התקדמות - לחיצות לדילוג ידני */}
      {tips.length > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
          {tips.map((_, i) => (
            <Box
              key={i}
              role="button"
              aria-label={t('tipNumberAria').replace('{num}', String(i + 1))}
              onClick={() => setIdx(i)}
              sx={{
                width: i === idx ? 18 : 6, height: 6, borderRadius: '3px',
                bgcolor: i === idx ? '#6366F1' : (isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.22)'),
                cursor: 'pointer',
                transition: 'width 0.3s ease, background 0.2s',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
