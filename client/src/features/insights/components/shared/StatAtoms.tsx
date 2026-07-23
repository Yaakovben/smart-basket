import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { fadeIn } from './animations';

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

// ===== כרטיס סטטיסטיקה - עיצוב פרימיום עם זוהר עדין =====
export const StatCard = ({ value, label, color, bg, border }: {
  value: React.ReactNode; label: string; color: string; bg: string; border: string;
}) => (
  <Paper elevation={0} sx={{
    position: 'relative',
    p: 1.5, borderRadius: '14px', textAlign: 'center',
    backgroundImage: `linear-gradient(135deg, ${bg} 0%, ${bg} 50%, transparent 130%)`,
    border: `1.5px solid ${border}`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 6px ${color}14`,
    transition: 'transform 0.15s ease, box-shadow 0.2s ease',
    overflow: 'hidden',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 12px ${color}26`,
    },
  }}>
    <Typography sx={{
      fontSize: 21, fontWeight: 900, color, lineHeight: 1,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: -0.3,
    }}>{value}</Typography>
    <Typography sx={{
      fontSize: 9.5, color: 'text.secondary', fontWeight: 700, mt: 0.5,
      letterSpacing: 0.3,
    }}>{label}</Typography>
  </Paper>
);

// ===== כרטיס קטע - עיצוב פרימיום עם פס מבטא טורקיז וטיפוגרפיה היררכית =====
// מטרה: להעלות את ה-UI מ"כרטיס שטוח" ל"כרטיס פרימיום" שנותן הרגשה של אפליקציה איכותית.
// פס מבטא טורקיז דק מימין (RTL), כותרת עם letter-spacing, צל רב-שכבתי עדין.
export const SectionCard = ({ title, children, isDark }: {
  title: string; children: React.ReactNode; isDark: boolean;
}) => (
  <Paper elevation={0} sx={{
    position: 'relative',
    p: 2, mb: 2, borderRadius: '18px',
    border: '1px solid',
    borderColor: isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.1)',
    backgroundImage: isDark
      ? 'linear-gradient(180deg, rgba(20,184,166,0.04) 0%, transparent 100%)'
      : 'linear-gradient(180deg, rgba(20,184,166,0.025) 0%, rgba(255,255,255,1) 100%)',
    boxShadow: isDark
      ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.15)'
      : 'inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 8px rgba(20,184,166,0.06), 0 6px 18px rgba(15,118,110,0.04)',
    animation: `${fadeIn} 0.35s ease both`,
    overflow: 'hidden',
    // פס טורקיז עדין מימין (RTL)
    '&::before': {
      content: '""', position: 'absolute',
      top: 14, bottom: 14, right: 0,
      width: 2.5, borderRadius: '3px 0 0 3px',
      backgroundImage: 'linear-gradient(180deg, #14B8A6 0%, #0D9488 100%)',
      opacity: 0.85,
    },
  }}>
    <Typography sx={{
      fontSize: 13.5, fontWeight: 800, mb: 1.5,
      letterSpacing: 0.2,
      color: isDark ? '#5EEAD4' : '#0F766E',
    }}>{title}</Typography>
    {children}
  </Paper>
);

// ===== שורת כותרת אישית בראש כל טאב - עיצוב פרימיום עם זוהר אייקון =====
export const HeroInsight = ({ icon, text, accent, isDark }: {
  icon: string;
  text: React.ReactNode;
  accent: string;
  isDark: boolean;
}) => (
  <Box sx={{
    position: 'relative',
    display: 'flex', alignItems: 'center', gap: 1.25,
    px: 1.5, py: 1.25, mb: 1.75, borderRadius: '16px',
    backgroundImage: isDark
      ? `linear-gradient(135deg, ${accent}22 0%, ${accent}08 50%, transparent 100%)`
      : `linear-gradient(135deg, ${accent}16 0%, ${accent}04 50%, rgba(255,255,255,0.5) 100%)`,
    backdropFilter: 'blur(8px)',
    border: '1px solid',
    borderColor: isDark ? `${accent}38` : `${accent}30`,
    boxShadow: isDark
      ? `inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px ${accent}1A`
      : `inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 6px ${accent}14, 0 6px 16px ${accent}10`,
    animation: `${fadeIn} 0.4s ease both`,
    overflow: 'hidden',
  }}>
    <Box sx={{
      width: 40, height: 40, flexShrink: 0,
      borderRadius: '12px',
      backgroundImage: `linear-gradient(135deg, ${accent}, ${accent}CC)`,
      color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 20,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 6px ${accent}40`,
    }}>
      {icon}
    </Box>
    <Typography sx={{
      flex: 1, fontSize: 13, color: 'text.primary', lineHeight: 1.5, fontWeight: 500,
      '& b': { color: accent, fontWeight: 800 },
    }}>
      {text}
    </Typography>
  </Box>
);
