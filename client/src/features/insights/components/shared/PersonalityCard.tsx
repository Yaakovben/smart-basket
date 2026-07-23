import { Box, Typography } from '@mui/material';
import { fadeIn } from './animations';

// ===== כרטיס אישיות קנייה =====
// מציג את ה-shoppingPersonality שכבר מחושב בשרת (השף, היעיל, וכו׳).
// כרטיס גדול ומרשים - גרדיאנט, אמוג'י ענק, תיאור. כניסה אנימטיבית.
// מטרה: לתת למשתמש זהות מיידית ויזואלית. "אני סוג כזה של קונה!"
export const PersonalityCard = ({ personality, isDark }: {
  personality: { type: string; emoji: string; description: string };
  isDark: boolean;
}) => (
  <Box sx={{
    position: 'relative', mb: 2, p: 2.25, borderRadius: '20px',
    background: isDark
      ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)'
      : 'linear-gradient(135deg, #818CF8 0%, #A78BFA 50%, #F472B6 100%)',
    color: 'white',
    boxShadow: '0 10px 30px rgba(139,92,246,0.32)',
    overflow: 'hidden',
    animation: `${fadeIn} 0.5s ease 0.1s both`,
  }}>
    {/* קישוטי רקע - שני עיגולים מטושטשים לעומק */}
    <Box sx={{
      position: 'absolute', top: -40, right: -30, width: 140, height: 140,
      borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.12)',
      pointerEvents: 'none',
    }} />
    <Box sx={{
      position: 'absolute', bottom: -50, left: -40, width: 130, height: 130,
      borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.08)',
      pointerEvents: 'none',
    }} />
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.75 }}>
      {/* אמוג'י עם hover-bounce עדין */}
      <Box sx={{
        width: 68, height: 68, flexShrink: 0,
        borderRadius: '20px',
        bgcolor: 'rgba(255,255,255,0.22)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 38, lineHeight: 1,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 14px rgba(0,0,0,0.15)',
        animation: 'persFloat 3.2s ease-in-out infinite',
        '@keyframes persFloat': {
          '0%, 100%': { transform: 'translateY(0) rotate(-2deg)' },
          '50%': { transform: 'translateY(-4px) rotate(2deg)' },
        },
      }}>
        {personality.emoji}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6,
          opacity: 0.92, textTransform: 'uppercase',
        }}>
          האישיות שלך
        </Typography>
        <Typography sx={{
          fontSize: 22, fontWeight: 900, lineHeight: 1.15, mt: 0.2,
          letterSpacing: -0.4,
          textShadow: '0 1px 4px rgba(0,0,0,0.18)',
        }}>
          {personality.type}
        </Typography>
        <Typography sx={{
          fontSize: 11.5, opacity: 0.93, mt: 0.5, lineHeight: 1.45,
        }}>
          {personality.description}
        </Typography>
      </Box>
    </Box>
  </Box>
);
