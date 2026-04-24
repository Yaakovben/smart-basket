import { Dialog, Box, Typography, Button, IconButton, Fade } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import { useSettings } from '../../global/context/SettingsContext';
import { haptic } from '../../global/helpers';
import { useBodyScrollLock } from '../../global/hooks/useBodyScrollLock';
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
  useBodyScrollLock(true);

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
      fullWidth
      maxWidth={false}
      TransitionComponent={Fade}
      transitionDuration={500}
      PaperProps={{
        sx: {
          bgcolor: 'transparent',
          boxShadow: 'none',
          overflow: 'visible',
          // מרווח גדול יותר בצדדים כדי שהמסגרת הזהובה + הצל הזוהר סביבה לא יתגלשו/ייחתכו
          mx: 0,
          my: 2,
          maxWidth: '100%',
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
            background: 'linear-gradient(160deg, #FFFDF2 0%, #FFFAE5 50%, #FEF2CC 100%)',
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

          {/* שורת פעולה - שיתוף מימין (ראשון ב-DOM כדי להופיע בצד ימין ב-RTL), ראשי משמאל */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1, width: '100%', alignItems: 'stretch' }}>
            {/* שיתוף - קצת יותר רחב, צד ימין */}
            <IconButton
              onClick={handleShare}
              aria-label={t('dailyFaithShareAria')}
              disableRipple
              sx={{
                width: 60,
                height: 56,
                flexShrink: 0,
                borderRadius: '18px',
                color: '#8B6914',
                background: 'rgba(255, 244, 201, 0.5)',
                border: '1.5px solid rgba(139, 105, 20, 0.5)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                transition: 'background 0.08s, border-color 0.08s, transform 0.06s',
                '&:hover': {
                  background: 'rgba(255, 231, 160, 0.7)',
                  borderColor: '#8B6914',
                },
                '&:active': { transform: 'scale(0.94)', background: 'rgba(255, 231, 160, 0.9)' },
              }}
            >
              <ShareIcon sx={{ fontSize: 20 }} />
            </IconButton>

            {/* קראתי והתחזקתי - הצבע המקורי מ-main: gradient זהב אלכסוני */}
            <Button
              onClick={handleClose}
              sx={{
                flex: 1,
                height: 56,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 100%)',
                color: 'white',
                fontWeight: 700,
                fontSize: 15,
                boxShadow: '0 4px 14px rgba(184, 134, 11, 0.4)',
                textTransform: 'none',
                transition: 'background 0.08s ease, transform 0.06s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #9C7209 0%, #B8860B 100%)',
                },
                '&:active': { transform: 'scale(0.96)', background: 'linear-gradient(135deg, #805C07 0%, #9C7209 100%)' },
              }}
            >
              {t('dailyFaithReadButton')}
            </Button>
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
