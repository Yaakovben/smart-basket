import { Dialog, Box, Typography, Button, IconButton } from '@mui/material';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useSettings } from '../context/SettingsContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

// פופאפ חד-פעמי (ראו התנאי המבוסס-DB ב-router/index.tsx: forceLoggedOutAt
// מול logoutApologySeenAt) שמוצג רק למי שבאמת עבר ניתוק כפוי חד-פעמי של
// כל המשתמשים (server/api/src/scripts/force-logout-all.ts / endpoint
// האדמין). ניסוח מרוכך בכוונה - "ייתכן שנותקת" ולא "ניתקנו אותך", כי
// force-logout-all פועל על כולם בבת אחת בלי לדעת מי בפועל היה מחובר
// באותו רגע - חלק גדול מהמשתמשים לא הרגישו בכלל בניתוק, וניסוח נחרץ
// ("ניתקנו אותך") היה מפחיד אותם לחשוב שקרה משהו לחשבון שלהם.
export const MaintenanceApologyNotice = ({ open, onClose }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { borderRadius: '28px', overflow: 'hidden', bgcolor: isDark ? '#0F172A' : '#fff', width: 'min(350px, calc(100vw - 40px))' } }}
    >
      <Box sx={{
        position: 'relative', overflow: 'hidden', textAlign: 'center', px: 3, pt: 5, pb: 3,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25,
        background: isDark
          ? 'radial-gradient(circle at 50% 0%, rgba(20,184,166,0.28), transparent 65%)'
          : 'radial-gradient(circle at 50% 0%, rgba(20,184,166,0.14), transparent 65%)',
      }}>
        <IconButton
          onClick={onClose}
          aria-label="close"
          sx={{
            position: 'absolute', top: 10, insetInlineEnd: 10, zIndex: 1,
            color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.4)',
            '&:hover': { color: isDark ? '#fff' : '#0F172A' },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 19 }} />
        </IconButton>

        <Box sx={{
          width: 72, height: 72, borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #2DD4BF, #0D9488)', boxShadow: '0 14px 30px rgba(13,148,136,0.4)',
          animation: 'sbApologyPop 0.55s cubic-bezier(0.34,1.56,0.64,1) both',
          '@keyframes sbApologyPop': { from: { transform: 'scale(0.4) rotate(-12deg)', opacity: 0 }, to: { transform: 'scale(1) rotate(0)', opacity: 1 } },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}>
          <ShieldRoundedIcon sx={{ fontSize: 36, color: '#fff' }} />
        </Box>

        <Typography sx={{ fontSize: 19, fontWeight: 900, mt: 0.5 }}>רק ליידע אתכם</Typography>
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.7, maxWidth: 280 }}>
          בעקבות עבודות תשתית ייתכן שנותקתם והתבקשתם להתחבר מחדש. הנתונים
          שלכם בטוחים ולא נפגעו, וזה לא אמור לחזור על עצמו.
        </Typography>

        <Button
          variant="contained" fullWidth onClick={onClose}
          sx={{
            borderRadius: '14px', py: 1.2, textTransform: 'none', fontWeight: 800, fontSize: 15, mt: 1.5,
            bgcolor: '#0D9488', boxShadow: 'none', '&:hover': { bgcolor: '#0F766E', boxShadow: 'none' },
          }}
        >
          הבנתי, תודה
        </Button>
      </Box>
    </Dialog>
  );
};
