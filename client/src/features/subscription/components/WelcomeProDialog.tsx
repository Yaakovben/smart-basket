import { Dialog, Box, Typography, Button } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useSettings } from '../../../global/context/SettingsContext';
import { getSubscriptionStrings } from '../subscription.strings';
import { PRO_LILAC, primaryCtaSx, ghostCtaSx } from '../subscription.styles';

export type PlanWelcomeVariant = 'trial' | 'paid' | 'manual';

interface Props {
  // null = סגור.
  open: PlanWelcomeVariant | null;
  // trial: חודשי המתנה. paid/manual: תאריך התפוגה (undefined = מנוי קבוע).
  months?: number;
  expiryDate?: string;
  onClose: () => void;
  onDetails: () => void;
}

const RAYS = Array.from({ length: 8 });

const VARIANT_ICON = { trial: CardGiftcardRoundedIcon, paid: CheckCircleRoundedIcon, manual: StarRoundedIcon };

// מסך קבלת פנים אחיד לכל דרך שבה משתמש הופך ל-Pro: מתנה (הרשמה/מענק
// למשתמשים ותיקים), תשלום שאושר, או הפעלה ידנית ע"י אדמין - אותו עיצוב
// בדיוק (הילה מסתובבת סביב אריח סגול), רק הכותרת/התג/הטקסט משתנים לפי
// האמת בפועל, כדי שלא ייווצר רושם מוטעה על איך המנוי הופעל.
export const WelcomeProDialog = ({ open, months, expiryDate, onClose, onDetails }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const s = getSubscriptionStrings(settings.language);

  const title = open === 'trial' ? s.welcomeTitle : open === 'paid' ? s.paidWelcomeTitle : s.manualWelcomeTitle;
  const body = open === 'trial'
    ? s.welcomeBody.replace('{n}', String(months ?? 3))
    : open === 'paid'
      ? (expiryDate ? s.paidWelcomeBody.replace('{date}', expiryDate) : s.paidWelcomeBodyPermanent)
      : (expiryDate ? s.manualWelcomeBody.replace('{date}', expiryDate) : s.manualWelcomeBodyPermanent);
  const badge = open === 'trial' ? s.trialBadge : open === 'paid' ? s.paidWelcomeBadge : s.proBadge;
  const Icon = open ? VARIANT_ICON[open] : StarRoundedIcon;

  return (
    <Dialog
      open={open !== null}
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
            <Icon sx={{ fontSize: 44, color: '#fff' }} />
          </Box>
        </Box>

        <Box sx={{
          px: 1.2, py: 0.3, borderRadius: '999px', bgcolor: isDark ? 'rgba(124,58,237,0.22)' : 'rgba(124,58,237,0.1)',
          color: isDark ? PRO_LILAC : '#6D28D9', fontSize: 11.5, fontWeight: 800, letterSpacing: 0.3,
        }}>
          {badge}
        </Box>
        <Typography sx={{ fontSize: 22, fontWeight: 900 }}>{title}</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.65, maxWidth: 290 }}>
          {body}
        </Typography>

        <Button variant="contained" fullWidth onClick={onClose} sx={{ ...primaryCtaSx, mt: 1.5 }}>{s.welcomeCta}</Button>
        <Button fullWidth onClick={onDetails} sx={ghostCtaSx}>{s.welcomeDetails}</Button>
      </Box>
    </Dialog>
  );
};
