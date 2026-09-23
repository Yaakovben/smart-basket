import { Dialog, Box, Typography, Button, IconButton } from '@mui/material';
import BuildCircleRoundedIcon from '@mui/icons-material/BuildCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useSettings } from '../context/SettingsContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

// פופאפ חד-פעמי (לצמיתות, ראו המפתח sb_cache_notice_shown_v1 ב-router/index.tsx)
// למשתמשים ותיקים בלבד - מסביר בקצרה שאחרי שדרוגי תוכנה אחרונים ייתכן
// שהאפליקציה תיתקע על "מתחבר לשרת"/פעולות ייכשלו, ומפנה ל-/clear.html
// (ניקוי SW+caches חד-פעמי, שומר טוקנים - לא מנתק) לפני שזה בכלל קורה.
// לא פותר משתמשים שכבר תקועים לגמרי על JS ישן (אין דרך "להגיע" אליהם -
// ה-JS שלהם קפוא ולא מריץ את הקוד הזה כלל), אבל מקדים תרופה למכה למי
// שעדיין מצליח לטעון את האפליקציה כרגיל.
export const CacheResetNotice = ({ open, onClose }: Props) => {
  const { settings, t } = useSettings();
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
          <BuildCircleRoundedIcon sx={{ fontSize: 34 }} />
        </Box>

        <Typography sx={{ fontSize: 18, fontWeight: 900, mt: 0.5 }}>{t('cacheNoticeTitle')}</Typography>
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.65 }}>
          {t('cacheNoticeBody')}
        </Typography>

        <Button
          variant="contained" fullWidth href="/clear.html"
          sx={{ borderRadius: '14px', py: 1.2, textTransform: 'none', fontWeight: 800, fontSize: 15, mt: 1, boxShadow: 'none' }}
        >
          {t('cacheNoticeCta')}
        </Button>
        <Button fullWidth onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700, fontSize: 13, color: 'text.secondary' }}>
          {t('cacheNoticeDismiss')}
        </Button>
      </Box>
    </Dialog>
  );
};
