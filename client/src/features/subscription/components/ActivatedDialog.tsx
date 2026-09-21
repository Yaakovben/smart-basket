import { Dialog, Box, Typography, Button } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import type { SubscriptionStrings } from '../subscription.strings';
import { PRO_GOLD, primaryCtaSx } from '../subscription.styles';

interface Props {
  open: boolean;
  s: SubscriptionStrings;
  isDark: boolean;
  onClose: () => void;
}

const CONFETTI = ['#FCD34D', '#A78BFA', '#34D399', '#F472B6', '#60A5FA', '#FBBF24'];

// חגיגת הפעלת מנוי: מופיעה רק כשהמנוי הופעל בזמן שהמשתמש בעמוד (אחרי אישור אדמין).
export const ActivatedDialog = ({ open, s, isDark, onClose }: Props) => (
  <Dialog
    open={open}
    onClose={onClose}
    PaperProps={{ sx: { borderRadius: '24px', overflow: 'hidden', bgcolor: isDark ? '#0F172A' : '#fff', width: 'min(340px, calc(100vw - 40px))' } }}
  >
    <Box sx={{
      position: 'relative', overflow: 'hidden', textAlign: 'center', px: 3, pt: 4, pb: 3,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25,
    }}>
      {CONFETTI.map((c, i) => (
        <Box key={i} aria-hidden sx={{
          position: 'absolute', top: -10, left: `${8 + i * 16}%`, width: 8, height: 12, borderRadius: '2px', bgcolor: c,
          animation: `sbConfetti 1.9s ${i * 0.12}s ease-in infinite`,
          '@keyframes sbConfetti': {
            '0%': { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
            '100%': { transform: 'translateY(230px) rotate(320deg)', opacity: 0 },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0 },
        }} />
      ))}
      <Box sx={{
        width: 84, height: 84, borderRadius: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 12px 30px rgba(124,58,237,0.45)',
        animation: 'sbPop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        '@keyframes sbPop': { from: { transform: 'scale(0.4)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}>
        <StarRoundedIcon sx={{ fontSize: 48, color: PRO_GOLD }} />
      </Box>
      <Typography sx={{ fontSize: 22, fontWeight: 900 }}>{s.activatedTitle}</Typography>
      <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.6 }}>{s.activatedBody}</Typography>
      <Button variant="contained" fullWidth onClick={onClose} sx={{ ...primaryCtaSx, mt: 1 }}>{s.activatedCta}</Button>
    </Box>
  </Dialog>
);
