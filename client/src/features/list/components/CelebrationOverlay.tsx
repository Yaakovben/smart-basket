import { memo, useState } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

// ===== אנימציות חגיגה =====
const floatUp = keyframes`
  0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translateY(-110vh) rotate(540deg) scale(0.2); opacity: 0; }
`;

const fallDown = keyframes`
  0% { transform: translateY(0) rotate(0deg) scale(0); opacity: 0; }
  15% { transform: translateY(10px) rotate(30deg) scale(1.2); opacity: 1; }
  100% { transform: translateY(90vh) rotate(360deg) scale(0.3); opacity: 0; }
`;

const sparkle = keyframes`
  0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
`;

const flashBg = keyframes`
  0% { opacity: 0; }
  15% { opacity: 0.15; }
  100% { opacity: 0; }
`;

const celebText = keyframes`
  0% { transform: scale(0) rotate(-10deg); opacity: 0; }
  40% { transform: scale(1.15) rotate(3deg); opacity: 1; }
  60% { transform: scale(0.95) rotate(-2deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const celebFade = keyframes`
  0%, 70% { opacity: 1; }
  100% { opacity: 0; }
`;

const COLORS = ['#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6', '#22C55E', '#3B82F6', '#06B6D4', '#FBBF24', '#A78BFA', '#34D399'];
const EMOJIS = ['🎉', '✨', '⭐', '🛒', '✅', '🎊', '🥳', '💪', '🏆', '👏'];

type ParticleType = 'confetti' | 'emoji' | 'sparkle';

interface Particle {
  id: number;
  type: ParticleType;
  left: string;
  top?: string;
  delay: string;
  duration: string;
  color: string;
  w: number;
  h: number;
  round: boolean;
  direction: 'up' | 'down';
  emoji?: string;
}

// יצירת חלקיק קונפטי
const makeConfetti = (id: number, direction: 'up' | 'down'): Particle => {
  const size = 5 + Math.random() * 8;
  const isRect = id % 3 === 2;
  return {
    id, type: 'confetti', direction,
    left: `${(direction === 'down' ? 10 : 0) + Math.random() * (direction === 'down' ? 80 : 100)}%`,
    delay: `${Math.random() * 0.4}s`,
    duration: `${2 + Math.random() * 1.5}s`,
    color: COLORS[id % COLORS.length],
    w: isRect ? size * 1.5 : size,
    h: isRect ? size * 0.6 : size,
    round: id % 3 === 0
  };
};

// בונה רשימת חלקיקים חד-פעמית. מוצא מחוץ לקומפוננטה כדי שלא ייקרא ב-render.
const buildParticles = (): Particle[] => [
  // 20 חלקיקים עולים + 20 יורדים
  ...Array.from({ length: 20 }, (_, i) => makeConfetti(i, 'up')),
  ...Array.from({ length: 20 }, (_, i) => makeConfetti(20 + i, 'down')),
  // 8 אמוג'ים
  ...Array.from({ length: 8 }, (_, i): Particle => ({
    id: 40 + i, type: 'emoji', direction: i % 2 === 0 ? 'up' : 'down',
    left: `${5 + Math.random() * 90}%`,
    delay: `${0.2 + Math.random() * 0.6}s`,
    duration: `${2.5 + Math.random() * 1}s`,
    color: '', w: 0, h: 0, round: false,
    emoji: EMOJIS[i % EMOJIS.length]
  })),
  // 12 ניצוצות
  ...Array.from({ length: 12 }, (_, i): Particle => {
    const size = 3 + Math.random() * 4;
    return {
      id: 48 + i, type: 'sparkle', direction: 'up',
      left: `${Math.random() * 100}%`,
      top: `${20 + Math.random() * 60}%`,
      delay: `${Math.random() * 1.5}s`,
      duration: `${1 + Math.random() * 1}s`,
      color: '#FBBF24', w: size, h: size, round: true
    };
  })
];

// ===== חגיגת השלמת רשימה - קונפטי, אמוג'ים וניצוצות =====
export const CelebrationOverlay = memo(() => {
  // useState עם initializer מבטיח שהחלקיקים נבנים רק פעם אחת ומחוץ ל-render-עצמו.
  // זה הפתרון הרשמי של React לערכים שדורשים פונקציה לא-טהורה (Math.random).
  const [particles] = useState<Particle[]>(buildParticles);

  const getAnim = (p: Particle) =>
    p.type === 'sparkle'
      ? `${sparkle} ${p.duration} ${p.delay} ease-in-out forwards`
      : `${p.direction === 'up' ? floatUp : fallDown} ${p.duration} ${p.delay} ease-out forwards`;

  return (
    <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {/* הבזק ירוק ברקע */}
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 30%, rgba(34, 197, 94, 0.3), transparent 70%)',
        animation: `${flashBg} 1.5s ease-out forwards`
      }} />

      {/* טקסט מרכזי */}
      <Box sx={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        animation: `${celebText} 0.6s ease-out 0.2s both, ${celebFade} 3s ease-out forwards`,
      }}>
        <Typography sx={{ fontSize: 48, lineHeight: 1 }}>🎉</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#22C55E', textShadow: '0 2px 8px rgba(34,197,94,0.3)', mt: 0.5 }}>
          ✓
        </Typography>
      </Box>

      {particles.map(p => (
        <Box key={p.id} sx={{
          position: 'absolute',
          left: p.left,
          ...(p.type === 'sparkle'
            ? { top: p.top, width: p.w, height: p.h, bgcolor: p.color, borderRadius: '50%', boxShadow: `0 0 ${p.w * 2}px ${p.color}` }
            : p.type === 'emoji'
              ? { [p.direction === 'up' ? 'bottom' : 'top']: p.direction === 'up' ? '-20px' : '60px', fontSize: 18, lineHeight: 1 }
              : { [p.direction === 'up' ? 'bottom' : 'top']: p.direction === 'up' ? '-10px' : '50px', width: p.w, height: p.h, bgcolor: p.color, borderRadius: p.round ? '50%' : '2px' }
          ),
          animation: getAnim(p)
        }}>
          {p.emoji}
        </Box>
      ))}
    </Box>
  );
});
CelebrationOverlay.displayName = 'CelebrationOverlay';
