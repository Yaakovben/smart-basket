import { Dialog, Box, Typography, Button } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { useSettings } from '../../../global/context/SettingsContext';
import { getSubscriptionStrings } from '../subscription.strings';
import { PRO_LILAC, primaryCtaSx, ghostCtaSx } from '../subscription.styles';

interface Props {
  // null = סגור. מספר החודשים שהמשתמש קיבל במתנה.
  months: number | null;
  onClose: () => void;
  onDetails: () => void;
}

const RAYS = Array.from({ length: 8 });

// מסך קבלת פנים חד-פעמי למשתמש חדש: "קיבלת N חודשי Pro במתנה". הילה מסתובבת
// סביב כוכב, כניסה עם קפיצה, ושני כפתורים (להתחיל / לפרטי המנוי).
export const WelcomeProDialog = ({ months, onClose, onDetails }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const s = getSubscriptionStrings(settings.language);

  return (
    <Dialog
      open={months !== null}
      onClose={onClose}
      PaperProps={{ sx: { borderRadius: '28px', overflow: 'hidden', bgcolor: isDark ? '#0F172A' : '#fff', width: 'min(350px, calc(100vw - 40px))' } }}
    >
      <Box sx={{
        position: 'relative', overflow: 'hidden', textAlign: 'center', px: 3, pt: 5, pb: 3,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25,
        background: isDark
          ? 'radial-gradient(circle at 50% 0%, rgba(124,58,237,0.35), transparent 65%)'
          : 'radial-gradient(circle at 50% 0%, rgba(124,58,237,0.16), transparent 65%)',
      }}>
        <Box sx={{ position: 'relative', width: 104, height: 104, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box aria-hidden sx={{
            position: 'absolute', inset: 0,
            animation: 'sbWelcomeSpin 14s linear infinite',
            '@keyframes sbWelcomeSpin': { to: { transform: 'rotate(360deg)' } },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}>
            {RAYS.map((_, i) => (
              <Box key={i} sx={{
                position: 'absolute', top: '50%', left: '50%', width: 4, height: 14, borderRadius: 2,
                bgcolor: PRO_LILAC, opacity: 0.55,
                transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-48px)`,
              }} />
            ))}
          </Box>
          <Box sx={{
            width: 78, height: 78, borderRadius: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #8B5CF6, #5B21B6)', boxShadow: '0 14px 34px rgba(124,58,237,0.5)',
            animation: 'sbWelcomePop 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
            '@keyframes sbWelcomePop': { from: { transform: 'scale(0.3) rotate(-20deg)', opacity: 0 }, to: { transform: 'scale(1) rotate(0)', opacity: 1 } },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}>
            <StarRoundedIcon sx={{ fontSize: 46, color: '#fff' }} />
          </Box>
        </Box>

        <Typography sx={{ fontSize: 23, fontWeight: 900, mt: 1 }}>{s.welcomeTitle}</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.65, maxWidth: 290 }}>
          {s.welcomeBody.replace('{n}', String(months ?? 3))}
        </Typography>

        <Button variant="contained" fullWidth onClick={onClose} sx={{ ...primaryCtaSx, mt: 1.5 }}>{s.welcomeCta}</Button>
        <Button fullWidth onClick={onDetails} sx={ghostCtaSx}>{s.welcomeDetails}</Button>
      </Box>
    </Dialog>
  );
};
