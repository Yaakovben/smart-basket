import { Dialog, Box, Typography, Button, Fade, keyframes } from '@mui/material';
import { useSettings } from '../../global/context/SettingsContext';
import { haptic } from '../../global/helpers';

// התמונה של הגוויל יושבת ב-public/ כך ש-Vite מגיש אותה ישירות ב-URL קבוע.
// שים את קובץ הגוויל הריק ב: client/public/daily-faith/parchment.jpg
const PARCHMENT_BG_URL = '/daily-faith/parchment.jpg';

interface DailyFaithPopupProps {
  text: string;
  onClose: () => void;
}

// זוהר עדין סביב הגוויל
const subtleGlow = keyframes`
  0%, 100% { filter: drop-shadow(0 12px 28px rgba(0,0,0,0.55)); }
  50%      { filter: drop-shadow(0 14px 34px rgba(255,200,90,0.18)) drop-shadow(0 12px 28px rgba(0,0,0,0.5)); }
`;

export const DailyFaithPopup = ({ text, onClose }: DailyFaithPopupProps) => {
  const { t } = useSettings();

  const handleClose = () => {
    haptic('light');
    onClose();
  };

  return (
    <Dialog
      open
      // נסגר רק בלחיצה על הכפתור - לא ב-backdrop ולא ב-Escape
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
          maxWidth: 'unset',
          width: 'auto',
        },
      }}
      sx={{
        '& .MuiBackdrop-root': {
          bgcolor: 'rgba(10,8,4,0.85)',
          backdropFilter: 'blur(6px)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* הגוויל עם הטקסט - גובה מוגבל לפי המסך כדי שלא ישתלט */}
        <Box
          sx={{
            position: 'relative',
            // מוגבל בגובה: 58vh במסך רגיל, 52vh במסכים נמוכים
            height: { xs: '52vh', sm: '58vh' },
            maxHeight: 560,
            // הרוחב נגזר מהיחס של התמונה (700:1040)
            aspectRatio: '700 / 1040',
            maxWidth: '92vw',
            backgroundImage: `url(${PARCHMENT_BG_URL})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            animation: `${subtleGlow} 4s ease-in-out infinite`,
          }}
        >
          {/* "בס"ד" בפינה הימנית העליונה של הגוויל */}
          <Typography
            sx={{
              position: 'absolute',
              top: '25%',
              right: '22%',
              fontSize: { xs: 10, sm: 12 },
              fontWeight: 700,
              color: '#3E2F0E',
              fontFamily: '"Frank Ruhl Libre", "David Libre", "Times New Roman", serif',
              opacity: 0.75,
              letterSpacing: 0.3,
            }}
          >
            בס״ד
          </Typography>

          {/* אזור הטקסט המרכזי - ממורכז בתוך הגוויל */}
          <Box
            sx={{
              position: 'absolute',
              top: '32%',
              bottom: '36%',
              left: { xs: '17%', sm: '18%' },
              right: { xs: '17%', sm: '18%' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 13, sm: 16 },
                fontWeight: 500,
                lineHeight: 1.55,
                color: '#3E2F0E',
                fontFamily: '"Frank Ruhl Libre", "David Libre", "Times New Roman", serif',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                letterSpacing: 0.2,
                // חיתוך חכם לטקסט ארוך במקום גלישה מחוץ לגוויל
                display: '-webkit-box',
                WebkitLineClamp: 6,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {text}
            </Typography>
          </Box>
        </Box>

        {/* כפתור "קראתי והתחזקתי" - מתחת לגוויל, קומפקטי */}
        <Button
          onClick={handleClose}
          sx={{
            px: 3.5,
            py: 1.1,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 55%, #B8860B 100%)',
            color: 'white',
            fontWeight: 800,
            fontSize: 14,
            boxShadow: '0 4px 14px rgba(184, 134, 11, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
            textTransform: 'none',
            letterSpacing: 0.4,
            border: '1px solid rgba(255,220,130,0.3)',
            transition: 'transform 0.12s, box-shadow 0.2s',
            '&:hover': {
              background: 'linear-gradient(135deg, #9C7209 0%, #B8860B 55%, #9C7209 100%)',
              boxShadow: '0 6px 18px rgba(184, 134, 11, 0.6)',
            },
            '&:active': {
              transform: 'scale(0.97)',
            },
          }}
        >
          {t('dailyFaithReadButton')}
        </Button>
      </Box>
    </Dialog>
  );
};
