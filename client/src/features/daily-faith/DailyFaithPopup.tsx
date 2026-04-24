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

          {/* שורת פעולות - עיצוב "מדליה": כפתור ראשי כמו מגילה זהובה עם כוכבים, שיתוף כחותם עגול */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1.5, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            {/* כפתור "קראתי והתחזקתי" - מגילה זהובה עם כוכבי ✦ משני הצדדים */}
            <Button
              onClick={handleClose}
              sx={{
                flex: 1,
                position: 'relative',
                px: 2.5,
                py: 1.6,
                borderRadius: '999px',
                background: 'linear-gradient(180deg, #E5B84E 0%, #C99836 55%, #A87E28 100%)',
                color: '#FFFBEA',
                fontFamily: '"Frank Ruhl Libre", "Times New Roman", serif',
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: 0.5,
                textShadow: '0 1px 2px rgba(89, 55, 0, 0.45)',
                // גבול זהב כפול - יוצר תחושת חותמת/מדליה
                border: '1.5px solid #8B5A04',
                boxShadow: '0 8px 20px rgba(139,90,4,0.35), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 0 0 2px rgba(255,248,210,0.35)',
                textTransform: 'none',
                transition: 'transform 0.12s ease, box-shadow 0.2s ease',
                '&:hover': {
                  background: 'linear-gradient(180deg, #D9A93E 0%, #B8872B 55%, #8B6914 100%)',
                  boxShadow: '0 10px 24px rgba(139,90,4,0.45), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 0 0 2px rgba(255,248,210,0.3)',
                },
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              <Box component="span" sx={{ position: 'absolute', insetInlineStart: 14, fontSize: 13, opacity: 0.85, color: '#FFF8D2' }} aria-hidden="true">✦</Box>
              {t('dailyFaithReadButton')}
              <Box component="span" sx={{ position: 'absolute', insetInlineEnd: 14, fontSize: 13, opacity: 0.85, color: '#FFF8D2' }} aria-hidden="true">✦</Box>
            </Button>

            {/* כפתור שיתוף - חותם עגול זהב, קטן וצנוע לצד הכפתור הראשי */}
            <IconButton
              onClick={handleShare}
              aria-label={t('dailyFaithShareAria')}
              disableRipple
              sx={{
                width: 48,
                height: 48,
                flexShrink: 0,
                borderRadius: '50%',
                color: '#8B5A04',
                background: 'radial-gradient(circle at 30% 30%, #FFF4C9 0%, #F4E4A6 55%, #D4AF37 100%)',
                border: '1.5px solid #8B5A04',
                boxShadow: '0 4px 12px rgba(139,90,4,0.3), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 0 0 2px rgba(255,248,210,0.5)',
                transition: 'transform 0.15s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'rotate(-6deg)',
                  boxShadow: '0 6px 16px rgba(139,90,4,0.4), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 0 0 2px rgba(255,248,210,0.45)',
                },
                '&:active': { transform: 'scale(0.92) rotate(-6deg)' },
              }}
            >
              <IosShareIcon sx={{ fontSize: 20 }} />
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
