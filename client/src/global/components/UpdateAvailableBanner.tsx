import { Box, Typography, ButtonBase } from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useSettings } from '../context/SettingsContext';

interface Props {
  open: boolean;
  onReload: () => void;
  onDismiss: () => void;
}

// גרסה חדשה של האפליקציה השתלטה ברקע (Service Worker חדש עשה activate),
// אבל הטאב/PWA הפתוח עדיין מריץ את ה-JS הישן בזיכרון - SW חדש לא מרענן
// אף עמוד אוטומטית (בכוונה, כדי לא לקטוע בקשה באמצע כמו refresh token -
// ראו ההערה ב-router/index.tsx). בלי שום חיווי, משתמש שמשאיר את ה-PWA
// פתוח/ברקע נשאר תקוע על קוד ישן *בלי לדעת*, וזה בדיוק מה שנראה כלפי חוץ
// כמו "כל פעולה נכשלת" - כי ה-JS הישן קורא ל-endpoints/חוזים שכבר השתנו.
// הבאנר הזה לא מרענן לבד - נותן למשתמש שליטה מתי, בלי לסכן session פעיל.
export const UpdateAvailableBanner = ({ open, onReload, onDismiss }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  if (!open) return null;

  return (
    <Box sx={{
      position: 'fixed', zIndex: 2100,
      bottom: 'max(16px, calc(env(safe-area-inset-bottom) + 12px))',
      left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100vw - 32px)', maxWidth: 380,
      display: 'flex', alignItems: 'center', gap: 1,
      px: 1.75, py: 1.1, borderRadius: '16px',
      bgcolor: isDark ? '#1E1B2E' : '#fff',
      border: '1.5px solid', borderColor: isDark ? 'rgba(167,139,250,0.35)' : 'rgba(124,58,237,0.25)',
      boxShadow: '0 10px 28px rgba(0,0,0,0.22)',
      animation: 'sbUpdateBannerIn 0.3s cubic-bezier(0.22,1,0.36,1) both',
      '@keyframes sbUpdateBannerIn': { from: { opacity: 0, transform: 'translateX(-50%) translateY(16px)' }, to: { opacity: 1, transform: 'translateX(-50%) translateY(0)' } },
      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
    }}>
      <Box sx={{
        width: 34, height: 34, borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: isDark ? 'rgba(124,58,237,0.22)' : 'rgba(124,58,237,0.1)', color: '#7C3AED',
      }}>
        <RefreshRoundedIcon sx={{ fontSize: 19 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>גרסה חדשה זמינה</Typography>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>רעננו כדי לקבל את העדכון האחרון</Typography>
      </Box>
      <ButtonBase
        onClick={onReload}
        sx={{
          flexShrink: 0, px: 1.5, py: 0.7, borderRadius: '10px', fontSize: 12.5, fontWeight: 800,
          color: '#fff', bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' },
        }}
      >
        רענון
      </ButtonBase>
      <ButtonBase
        onClick={onDismiss}
        aria-label="סגירה"
        sx={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', color: 'text.disabled', '&:hover': { bgcolor: 'action.hover' } }}
      >
        <CloseRoundedIcon sx={{ fontSize: 16 }} />
      </ButtonBase>
    </Box>
  );
};
