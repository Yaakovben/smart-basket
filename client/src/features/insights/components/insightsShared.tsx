/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, keyframes } from '@mui/material';

// אנימציות משותפות לעמוד התובנות
export const float = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}`;
export const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`;
// מעבר טאבים: שילוב של fade + slide קטן - תחושת מעבר חלק בלי להסיח את העין
export const tabEnter = keyframes`from{opacity:0;transform:translateY(12px) scale(0.99)}to{opacity:1;transform:translateY(0) scale(1)}`;

export const dayLabels = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export const scoreEmoji = (s: number) => s >= 90 ? '🏆' : s >= 80 ? '🔥' : s >= 60 ? '💪' : s >= 40 ? '📈' : '🌱';

// ספירה אנימטיבית
export const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = Date.now();
    const dur = 700;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);
  return <>{display}</>;
};

// ===== כרטיס סטטיסטיקה קטן - לשימוש חוזר ברחבי העמוד =====
export const StatCard = ({ value, label, color, bg, border }: {
  value: React.ReactNode; label: string; color: string; bg: string; border: string;
}) => (
  <Paper elevation={0} sx={{
    p: 1.25, borderRadius: '12px', textAlign: 'center',
    background: `linear-gradient(135deg, ${bg}, ${bg} 55%, transparent 130%)`,
    border: `1px solid ${border}`,
    transition: 'transform 0.15s ease, box-shadow 0.2s ease',
  }}>
    <Typography sx={{
      fontSize: 20, fontWeight: 900, color, lineHeight: 1,
      fontVariantNumeric: 'tabular-nums',
    }}>{value}</Typography>
    <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.4 }}>{label}</Typography>
  </Paper>
);

// ===== כרטיס קטע (ספציפי לעמוד) =====
export const SectionCard = ({ title, children, isDark }: {
  title: string; children: React.ReactNode; isDark: boolean;
}) => (
  <Paper elevation={0} sx={{
    p: 2, mb: 2, borderRadius: '16px',
    border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    animation: `${fadeIn} 0.35s ease both`,
  }}>
    <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1.5 }}>{title}</Typography>
    {children}
  </Paper>
);

// ===== שורת כותרת אישית בראש כל טאב - מסגור חם אחד, לא עמוס =====
export const HeroInsight = ({ icon, text, accent, isDark }: {
  icon: string;
  text: React.ReactNode;
  accent: string;
  isDark: boolean;
}) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', gap: 1.25,
    px: 1.5, py: 1.25, mb: 1.75, borderRadius: '14px',
    background: isDark
      ? `linear-gradient(135deg, ${accent}18, ${accent}06 75%)`
      : `linear-gradient(135deg, ${accent}12, ${accent}03 75%)`,
    border: '1px solid', borderColor: isDark ? `${accent}2A` : `${accent}22`,
    animation: `${fadeIn} 0.4s ease both`,
  }}>
    <Box sx={{
      width: 36, height: 36, flexShrink: 0,
      borderRadius: '10px', bgcolor: isDark ? `${accent}28` : `${accent}18`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 19,
    }}>
      {icon}
    </Box>
    <Typography sx={{
      flex: 1, fontSize: 13, color: 'text.primary', lineHeight: 1.5,
      '& b': { color: accent, fontWeight: 800 },
    }}>
      {text}
    </Typography>
  </Box>
);
