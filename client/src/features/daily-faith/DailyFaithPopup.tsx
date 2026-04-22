import { Dialog, Box, Typography, Button, Fade } from '@mui/material';
import { useSettings } from '../../global/context/SettingsContext';
import { haptic } from '../../global/helpers';

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
    haptic('light');
    onClose();
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
              gap: 1,
              px: 2.5,
              py: 0.85,
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #FFF4C9 0%, #FFE7A0 100%)',
              border: '1.5px solid rgba(184, 134, 11, 0.5)',
              boxShadow: '0 3px 10px rgba(184, 134, 11, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            }}
          >
            {/* כוכבית דקורטיבית שמאל */}
            <Box sx={{ color: '#B8860B', fontSize: 12, opacity: 0.8 }} aria-hidden="true">✦</Box>
            <Typography
              sx={{
                fontSize: 13.5,
                fontWeight: 800,
                color: '#8B6914',
                letterSpacing: 1.5,
                fontFamily: '"Frank Ruhl Libre", "Times New Roman", serif',
              }}
            >
              {t('dailyFaithTitle')}
            </Typography>
            {/* כוכבית דקורטיבית ימין */}
            <Box sx={{ color: '#B8860B', fontSize: 12, opacity: 0.8 }} aria-hidden="true">✦</Box>
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
            {text}
          </Typography>

          {/* כפתור זהב */}
          <Button
            onClick={handleClose}
            sx={{
              mt: 2,
              px: 4,
              py: 1.25,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 100%)',
              color: 'white',
              fontWeight: 700,
              fontSize: 15,
              boxShadow: '0 4px 14px rgba(184, 134, 11, 0.4)',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, #9C7209 0%, #B8860B 100%)',
              },
              '&:active': {
                transform: 'scale(0.97)',
              },
            }}
          >
            {t('dailyFaithReadButton')}
          </Button>
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
