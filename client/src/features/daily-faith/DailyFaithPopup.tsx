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

// זוהר עדין סביב הגוויל - כאילו מואר מאחור
const subtleGlow = keyframes`
  0%, 100% { filter: drop-shadow(0 16px 36px rgba(0,0,0,0.6)); }
  50%      { filter: drop-shadow(0 18px 44px rgba(255,200,90,0.2)) drop-shadow(0 16px 36px rgba(0,0,0,0.55)); }
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
          maxWidth: 440,
          width: '100%',
        },
      }}
      sx={{
        '& .MuiBackdrop-root': {
          bgcolor: 'rgba(10,8,4,0.88)',
          backdropFilter: 'blur(8px)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2.5,
        }}
      >
        {/* הגוויל עם הטקסט */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '700 / 1040',
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
              top: '24%',
              right: '20%',
              fontSize: { xs: 11, sm: 13 },
              fontWeight: 700,
              color: '#3E2F0E',
              fontFamily: '"Frank Ruhl Libre", "David Libre", "Times New Roman", serif',
              opacity: 0.8,
              letterSpacing: 0.5,
            }}
          >
            בס״ד
          </Typography>

          {/* אזור הטקסט המרכזי - ממורכז בתוך הגוויל */}
          <Box
            sx={{
              position: 'absolute',
              top: '30%',
              bottom: '38%',
              left: { xs: '16%', sm: '18%' },
              right: { xs: '16%', sm: '18%' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 14, sm: 17 },
                fontWeight: 500,
                lineHeight: 1.65,
                color: '#3E2F0E',
                fontFamily: '"Frank Ruhl Libre", "David Libre", "Times New Roman", serif',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                // אותיות עם תחושת כתב יד קליל
                letterSpacing: 0.3,
              }}
            >
              {text}
            </Typography>
          </Box>
        </Box>

        {/* כפתור "קראתי והתחזקתי" - מתחת לגוויל, בצבעים תואמים */}
        <Button
          onClick={handleClose}
          sx={{
            px: 4.5,
            py: 1.35,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 55%, #B8860B 100%)',
            color: 'white',
            fontWeight: 800,
            fontSize: 15,
            boxShadow: '0 6px 20px rgba(184, 134, 11, 0.55), inset 0 1px 0 rgba(255,255,255,0.3)',
            textTransform: 'none',
            letterSpacing: 0.5,
            border: '1px solid rgba(255,220,130,0.3)',
            transition: 'transform 0.12s, box-shadow 0.2s',
            '&:hover': {
              background: 'linear-gradient(135deg, #9C7209 0%, #B8860B 55%, #9C7209 100%)',
              boxShadow: '0 8px 24px rgba(184, 134, 11, 0.65), inset 0 1px 0 rgba(255,255,255,0.35)',
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
