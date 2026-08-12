import { Box, Typography } from '@mui/material';
import { fadeIn } from './animations';

// ===== Spotlight Product - המוצר הנקנה ביותר כ-hero ראווה =====
// אמוג'י-קטגוריה ענק על רקע גרדיאנט, שם המוצר, ספירה גדולה.
// משתמש בנתונים הקיימים של topProducts אבל נותן להם זוהר.
export const SpotlightProduct = ({ name, count, icon, isDark, t }: {
  name: string; count: number; icon: string; isDark: boolean; t: (key: string) => string;
}) => (
  <Box sx={{
    position: 'relative', mb: 2, p: 2, borderRadius: '20px',
    background: isDark
      ? 'linear-gradient(135deg, #F59E0B 0%, #EA580C 60%, #DC2626 100%)'
      : 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 60%, #F97316 100%)',
    color: 'white',
    boxShadow: '0 10px 28px rgba(245,158,11,0.35)',
    overflow: 'hidden',
    animation: `${fadeIn} 0.5s ease 0.05s both`,
  }}>
    {/* קרניים מסביב - "כוכב המופע" */}
    <Box sx={{
      position: 'absolute', top: '50%', right: -30,
      width: 160, height: 160, transform: 'translateY(-50%)',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,255,255,0.22), transparent 60%)',
      pointerEvents: 'none',
    }} />
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.75 }}>
      <Box sx={{
        width: 76, height: 76, flexShrink: 0,
        borderRadius: '20px',
        bgcolor: 'rgba(255,255,255,0.22)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 42, lineHeight: 1,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 14px rgba(0,0,0,0.2)',
        animation: 'spotPulse 2.6s ease-in-out infinite',
        '@keyframes spotPulse': {
          '0%, 100%': { transform: 'scale(1) rotate(-3deg)' },
          '50%': { transform: 'scale(1.06) rotate(3deg)' },
        },
      }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6,
          opacity: 0.92, textTransform: 'uppercase',
        }}>
          {t('topProductLabel')}
        </Typography>
        <Typography sx={{
          fontSize: 22, fontWeight: 900, lineHeight: 1.15, mt: 0.2,
          letterSpacing: -0.4,
          textShadow: '0 1px 4px rgba(0,0,0,0.18)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </Typography>
        <Typography sx={{
          fontSize: 12, opacity: 0.95, mt: 0.4, lineHeight: 1.4, fontWeight: 600,
        }}>
          {(() => {
            const [before, after] = t('boughtTimesFavorite').split('{count}');
            return <>{before}<Typography component="span" sx={{ fontWeight: 900, fontSize: 14 }}>{count}</Typography>{after}</>;
          })()}
        </Typography>
      </Box>
    </Box>
  </Box>
);
