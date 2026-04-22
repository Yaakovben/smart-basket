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

// זוהר עדין שמשלב זהב (הקלף) עם טורקיז של האפליקציה - מחבר בין השניים
const appGlow = keyframes`
  0%, 100% { filter: drop-shadow(0 10px 24px rgba(0,0,0,0.45)) drop-shadow(0 0 20px rgba(20,184,166,0.15)); }
  50%      { filter: drop-shadow(0 14px 30px rgba(0,0,0,0.4)) drop-shadow(0 0 28px rgba(20,184,166,0.3)) drop-shadow(0 0 12px rgba(212,175,55,0.3)); }
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
        // רקע עם גוונים של האפליקציה - מחבר ויזואלית
        '& .MuiBackdrop-root': {
          bgcolor: 'rgba(12,30,32,0.85)',
          backdropFilter: 'blur(8px)',
          background: 'radial-gradient(ellipse at center, rgba(20,184,166,0.18), rgba(10,8,4,0.9) 60%)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
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
            animation: `${appGlow} 5s ease-in-out infinite`,
          }}
        >
          {/* "החיזוק היומי" בראש הגוויל - על החלק המגולגל */}
          <Typography
            sx={{
              position: 'absolute',
              top: '14.5%',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: { xs: 12, sm: 14 },
              fontWeight: 800,
              color: '#5D3A0A',
              fontFamily: '"Frank Ruhl Libre", "David Libre", serif',
              letterSpacing: 2,
              whiteSpace: 'nowrap',
              textShadow: '0 1px 0 rgba(255,230,180,0.5)',
              opacity: 0.9,
            }}
          >
            החיזוק היומי
          </Typography>

          {/* "בס״ד" בתוך הגוויל - בפינה ימנית למעלה של אזור הכתיבה */}
          <Typography
            sx={{
              position: 'absolute',
              top: '32%',
              right: '21%',
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

          {/* אזור הטקסט המרכזי - ממוקם אחרי ה-בס״ד */}
          <Box
            sx={{
              position: 'absolute',
              top: '38%',
              bottom: '36%',
              left: { xs: '19%', sm: '20%' },
              right: { xs: '19%', sm: '20%' },
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

        {/* כפתור "קראתי והתחזקתי" - משלב זהב וטורקיז של האפליקציה */}
        <Button
          onClick={handleClose}
          sx={{
            px: 3.5,
            py: 1.2,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 50%, #14B8A6 100%)',
            color: 'white',
            fontWeight: 800,
            fontSize: 14,
            boxShadow: '0 4px 16px rgba(184,134,11,0.45), 0 0 18px rgba(20,184,166,0.25), inset 0 1px 0 rgba(255,255,255,0.35)',
            textTransform: 'none',
            letterSpacing: 0.4,
            border: '1px solid rgba(255,220,130,0.35)',
            transition: 'transform 0.12s, box-shadow 0.2s',
            '&:hover': {
              background: 'linear-gradient(135deg, #9C7209 0%, #B8860B 50%, #0D9488 100%)',
              boxShadow: '0 6px 20px rgba(184,134,11,0.55), 0 0 22px rgba(20,184,166,0.35)',
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
