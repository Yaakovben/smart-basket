import { Dialog, Box, Typography, Button, IconButton, Fade } from '@mui/material';
import IosShareIcon from '@mui/icons-material/IosShare';
import { useSettings } from '../../global/context/SettingsContext';
import { haptic } from '../../global/helpers';
import { renderFaithText, stripFaithMarkers } from './formatFaithText';

interface DailyFaithPopupProps {
  text: string;
  onClose: () => void;
}

/**
 * פופאפ החיזוק היומי — גרסת קלף זהוב עם פינות מעוטרות.
 * רקע עם gradient חם, גבול מוזהב, טקסט סריף מעוצב, בלי תמונות.
 * Backdrop click סוגר (safety-net), כפתור "קראתי והתחזקתי" ראשי.
 */
export const DailyFaithPopup = ({ text, onClose }: DailyFaithPopupProps) => {
  const { t } = useSettings();

  const handleClose = () => {
    haptic('medium');
    onClose();
  };

  // שיתוף המשפט - מנסה share sheet נטיבי (מובייל), נופל ל-wa.me (דסקטופ)
  const handleShare = async () => {
    haptic('light');
    // מנקים סימוני עיצוב פנימיים לפני שיתוף כדי שהודעת WhatsApp תצא טבעית
    const cleanText = stripFaithMarkers(text);
    const message = `${t('dailyFaithShareLine')}\n\n"${cleanText}"\n\n${t('dailyFaithShareFooter')}\n${window.location.origin}`;
    type ShareCapable = Navigator & { share?: (data: { text?: string; title?: string; url?: string }) => Promise<void> };
    const nav = navigator as ShareCapable;
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ text: message, title: t('dailyFaithTitle') });
        return;
      } catch {
        // המשתמש ביטל או שה-share נכשל — נופלים לפתיחת WhatsApp
      }
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog
      open
      // הפופאפ נסגר רק בלחיצה על "קראתי והתחזקתי" — לא ב-backdrop וגם לא ב-Escape
      onClose={(_e, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
        handleClose();
      }}
      disableEscapeKeyDown
      TransitionComponent={Fade}
      transitionDuration={500}
      PaperProps={{
        sx: {
          bgcolor: 'transparent',
          boxShadow: 'none',
          overflow: 'visible',
          m: 2,
          maxWidth: 400,
          width: '100%',
          // יציבות בגרירה: מונע תזוזה/גרירה של הפופאפ בלחיצה והחזקה על המסך
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        },
      }}
      sx={{
        '& .MuiBackdrop-root': {
          bgcolor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
        },
      }}
    >
      {/* קלף חיצוני - מסגרת זהובה עם gradient */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: '22px',
          p: 0.5,
          background: 'linear-gradient(135deg, #D4AF37 0%, #F4E4A6 40%, #B8860B 100%)',
          boxShadow: '0 20px 60px rgba(184, 134, 11, 0.5), 0 0 40px rgba(212, 175, 55, 0.3)',
        }}
      >
        {/* פנים הקלף - רקע קרם-זהב חם */}
        <Box
          sx={{
            borderRadius: '18px',
            background: 'linear-gradient(160deg, #FFF9E6 0%, #FFF3D4 50%, #FDE8B4 100%)',
            border: '2px solid rgba(184, 134, 11, 0.3)',
            px: 3,
            py: 5,
            textAlign: 'center',
            position: 'relative',
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            overflow: 'hidden',
          }}
        >
          {/* קישוטים בפינות */}
          <Box sx={cornerSx('top', 'left')}>✦</Box>
          <Box sx={cornerSx('top', 'right')}>✦</Box>
          <Box sx={cornerSx('bottom', 'left')}>✦</Box>
          <Box sx={cornerSx('bottom', 'right')}>✦</Box>

          {/* כותרת "החיזוק היומי" במסגרת עגולה מעוטרת - כדי שיהיה ברור שזו הכותרת */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.25,
              px: 3,
              py: 1.1,
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #FFF4C9 0%, #FFE7A0 100%)',
              border: '1.5px solid rgba(184, 134, 11, 0.5)',
              boxShadow: '0 3px 10px rgba(184, 134, 11, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            }}
          >
            {/* כוכבית דקורטיבית שמאל */}
            <Box sx={{ color: '#B8860B', fontSize: 15, opacity: 0.85 }} aria-hidden="true">✦</Box>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 800,
                color: '#8B6914',
                letterSpacing: 1.5,
                fontFamily: '"Frank Ruhl Libre", "Times New Roman", serif',
              }}
            >
              {t('dailyFaithTitle')}
            </Typography>
            {/* כוכבית דקורטיבית ימין */}
            <Box sx={{ color: '#B8860B', fontSize: 15, opacity: 0.85 }} aria-hidden="true">✦</Box>
          </Box>

          {/* קו מפריד זהב */}
          <Box sx={{ width: 40, height: 2, bgcolor: '#B8860B', borderRadius: 2, opacity: 0.6 }} />

          {/* טקסט החיזוק */}
          <Typography
            sx={{
              fontSize: 19,
              fontWeight: 500,
              lineHeight: 1.7,
              color: '#3E2F0E',
              fontFamily: '"Frank Ruhl Libre", "Times New Roman", serif',
              px: 1,
              whiteSpace: 'pre-wrap',
              wordBreak: 'keep-all',
              overflowWrap: 'normal',
              hyphens: 'none',
            }}
          >
            {renderFaithText(text)}
          </Typography>

          {/* כפתור ראשי רחב + קישור-שיתוף קטן מתחת */}
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25, width: '100%' }}>
            <Button
              onClick={handleClose}
              fullWidth
              sx={{
                py: 1.6,
                borderRadius: '14px',
                background: 'linear-gradient(180deg, #C99836 0%, #A87E28 100%)',
                color: 'white',
                fontWeight: 800,
                fontSize: 17,
                letterSpacing: 0.3,
                textShadow: '0 1px 2px rgba(89, 55, 0, 0.35)',
                boxShadow: '0 6px 18px rgba(168, 126, 40, 0.4), inset 0 1px 0 rgba(255,255,255,0.35)',
                border: '1px solid rgba(139, 90, 4, 0.6)',
                textTransform: 'none',
                transition: 'transform 0.12s ease, box-shadow 0.2s ease',
                '&:hover': {
                  background: 'linear-gradient(180deg, #B8872B 0%, #8B6914 100%)',
                  boxShadow: '0 8px 22px rgba(139, 105, 20, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
                },
                '&:active': { transform: 'scale(0.98)' },
              }}
            >
              {t('dailyFaithReadButton')}
            </Button>

            {/* שיתוף כקישור-טקסט צנוע - לא מתחרה עם הכפתור הראשי */}
            <Box
              component="button"
              onClick={handleShare}
              aria-label={t('dailyFaithShareAria')}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#8B6914',
                fontSize: 13,
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '8px',
                transition: 'color 0.15s, background 0.15s',
                '&:hover': { color: '#6B5010', background: 'rgba(184, 134, 11, 0.08)' },
                '&:active': { opacity: 0.7 },
              }}
            >
              <IosShareIcon sx={{ fontSize: 15 }} />
              {t('dailyFaithShareAria')}
            </Box>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

// סגנון הפינות המעוטרות (✦)
const cornerSx = (v: 'top' | 'bottom', h: 'left' | 'right') => ({
  position: 'absolute' as const,
  [v]: 10,
  [h]: 14,
  color: '#B8860B',
  fontSize: 18,
  opacity: 0.6,
  pointerEvents: 'none' as const,
});
