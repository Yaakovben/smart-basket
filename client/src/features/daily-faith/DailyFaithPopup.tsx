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

          {/* שורת פעולה - לוחית ברונזה ראשית + כפתור שיתוף קטן לצידה */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1, width: '100%', alignItems: 'stretch' }}>
            <Button
              onClick={handleClose}
              sx={{
                flex: 1,
                height: 56,
                borderRadius: '16px',
                background: 'linear-gradient(90deg, #8B6914 0%, #6B4710 30%, #6B4710 70%, #8B6914 100%)',
                color: '#FFE9B8',
                fontFamily: '"Frank Ruhl Libre", "Times New Roman", serif',
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: 0.8,
                textShadow: '0 -1px 0 rgba(0,0,0,0.45), 0 1px 0 rgba(255,220,140,0.12)',
                boxShadow: '0 8px 22px rgba(74, 48, 10, 0.45), inset 0 1px 0 rgba(255, 220, 140, 0.25), inset 0 -2px 4px rgba(0, 0, 0, 0.25)',
                border: '1px solid #3E2F0E',
                textTransform: 'none',
                transition: 'filter 0.15s ease',
                '&:hover': { filter: 'brightness(1.08)' },
                '&:active': { filter: 'brightness(0.92)' },
              }}
            >
              {t('dailyFaithReadButton')}
            </Button>

            {/* שיתוף קטן לצידו - outline קרם/זהב, מרובע, תואם גובה */}
            <IconButton
              onClick={handleShare}
              aria-label={t('dailyFaithShareAria')}
              disableRipple
              sx={{
                width: 44,
                height: 56,
                flexShrink: 0,
                borderRadius: '12px',
                color: '#8B6914',
                background: 'rgba(255, 244, 201, 0.5)',
                border: '1.5px solid rgba(139, 105, 20, 0.5)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                transition: 'background 0.2s, border-color 0.2s, transform 0.12s',
                '&:hover': {
                  background: 'rgba(255, 231, 160, 0.7)',
                  borderColor: '#8B6914',
                },
                '&:active': { transform: 'scale(0.94)' },
              }}
            >
              <IosShareIcon sx={{ fontSize: 18 }} />
            </IconButton>
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
