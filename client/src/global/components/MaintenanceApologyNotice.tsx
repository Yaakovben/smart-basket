import { Dialog, Box, Typography, Button, IconButton } from '@mui/material';
import SentimentSatisfiedRoundedIcon from '@mui/icons-material/SentimentSatisfiedRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useSettings } from '../context/SettingsContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

// פופאפ חד-פעמי (לצמיתות, ראו המפתח sb_maintenance_apology_shown_v1
// ב-router/index.tsx) שמוצג לכל משתמש בכניסה הראשונה אחרי ניתוק כפוי
// חד-פעמי של כל המשתמשים (server/api/src/scripts/force-logout-all.ts) -
// מתנצל ומסביר בקצרה שהניתוק היה עקב עבודות תשתית, לא באג בחשבון שלהם.
export const MaintenanceApologyNotice = ({ open, onClose }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { borderRadius: '24px', overflow: 'hidden', bgcolor: isDark ? '#0F172A' : '#fff', width: 'min(340px, calc(100vw - 40px))' } }}
    >
      <Box sx={{
        position: 'relative', textAlign: 'center', px: 3, pt: 4, pb: 3,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25,
      }}>
        <IconButton
          onClick={onClose}
          aria-label="close"
          sx={{
            position: 'absolute', top: 10, insetInlineEnd: 10,
            color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.4)',
            '&:hover': { color: isDark ? '#fff' : '#0F172A' },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 19 }} />
        </IconButton>

        <Box sx={{
          width: 64, height: 64, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: isDark ? 'rgba(20,184,166,0.18)' : 'rgba(20,184,166,0.1)', color: 'primary.main',
        }}>
          <SentimentSatisfiedRoundedIcon sx={{ fontSize: 34 }} />
        </Box>

        <Typography sx={{ fontSize: 18, fontWeight: 900, mt: 0.5 }}>מצטערים על אי הנוחות</Typography>
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.65 }}>
          בעקבות עבודות תשתית נדרשנו לנתק את כל המשתמשים ולבקש התחברות מחדש חד-פעמית.
          הנתונים שלכם בטוחים ולא נפגעו - וזה לא אמור לקרות שוב.
        </Typography>

        <Button
          variant="contained" fullWidth onClick={onClose}
          sx={{ borderRadius: '14px', py: 1.2, textTransform: 'none', fontWeight: 800, fontSize: 15, mt: 1, boxShadow: 'none' }}
        >
          הבנתי, תודה
        </Button>
      </Box>
    </Dialog>
  );
};
