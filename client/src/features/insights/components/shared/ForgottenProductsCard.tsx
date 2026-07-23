import { Box, Typography } from '@mui/material';
import { fadeIn } from './animations';

// ===== כרטיס "מוצרים שאולי שכחת" - friendly nudge =====
// מציג מוצרים שלא נראו לאחרונה ברשימות פעילות. מטרה: trigger רגשי
// ("אה נכון! שכחתי") שגורם למשתמש להוסיף לרשימה.
export const ForgottenProductsCard = ({ items, isDark }: {
  items: { name: string; lastSeen: string; category: string }[];
  isDark: boolean;
}) => {
  if (!items || items.length === 0) return null;
  return (
    <Box sx={{
      mb: 2, p: 1.75, borderRadius: '16px',
      background: isDark
        ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(20,184,166,0.05))'
        : 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(20,184,166,0.04))',
      border: '1px solid',
      borderColor: isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.2)',
      animation: `${fadeIn} 0.45s ease 0.1s both`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
        <Typography sx={{ fontSize: 18 }}>🤔</Typography>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
            אולי שכחת?
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.3, mt: 0.15 }}>
            מוצרים שקנית בעבר אבל לא הופיעו לאחרונה
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
        {items.slice(0, 5).map((p, i) => {
          const daysAgo = Math.max(1, Math.floor((Date.now() - new Date(p.lastSeen).getTime()) / 86_400_000));
          return (
            <Box key={i} sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              px: 1, py: 0.5, borderRadius: '10px',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.2)',
            }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary' }}>
                {p.name}
              </Typography>
              <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#D97706', fontVariantNumeric: 'tabular-nums' }}>
                · לפני {daysAgo}י׳
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
