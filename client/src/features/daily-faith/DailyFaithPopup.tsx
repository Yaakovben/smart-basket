import { useEffect } from 'react';
import { Box, Typography, Button, keyframes } from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { useSettings } from '../../global/context/SettingsContext';
import { haptic } from '../../global/helpers';

const PARCHMENT_BG_URL = '/daily-faith/parchment.jpg';

interface DailyFaithPopupProps {
  text: string;
  onClose: () => void;
}

// סגנון בדומה ל-InviteModal - overlay כהה עם blur
const overlaySx = {
  position: 'fixed' as const,
  inset: 0,
  bgcolor: 'rgba(0,0,0,0.55)',
  zIndex: 1000,
  backdropFilter: 'blur(5px)',
  touchAction: 'none' as const,
};

// כרטיס המודאל עצמו — בדיוק כמו ב-InviteModal
const containerSx = {
  position: 'fixed' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  borderRadius: '20px',
  p: 2.5,
  zIndex: 1001,
  width: '90%',
  maxWidth: 340,
  boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  overscrollBehavior: 'contain' as const,
  maxHeight: '90vh',
  overflowY: 'auto' as const,
  '@media (max-width: 360px)': { p: 1.75, borderRadius: '16px', maxWidth: 300 },
};

// פעימה עדינה זהובה — קשר לעיצוב של האפליקציה ללא הגזמה
const softGoldPulse = keyframes`
  0%, 100% { box-shadow: 0 4px 14px rgba(0,0,0,0.2); }
  50%      { box-shadow: 0 6px 18px rgba(0,0,0,0.25), 0 0 24px rgba(212,175,55,0.3); }
`;

export const DailyFaithPopup = ({ text, onClose }: DailyFaithPopupProps) => {
  const { t } = useSettings();

  // נעילת גלילה של גוף הדף
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleClose = () => {
    haptic('light');
    onClose();
  };

  return (
    <>
      {/* Overlay - לא נסגר בלחיצה כדי שרק הכפתור יסגור */}
      <Box sx={overlaySx} aria-hidden="true" />

      {/* Modal card */}
      <Box sx={containerSx} role="dialog" aria-labelledby="daily-faith-title">
        {/* תגית קטנה בסגנון האפליקציה בראש המודאל */}
        <Box sx={{ textAlign: 'center', mb: 1.75, '@media (max-width: 360px)': { mb: 1.25 } }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.6,
              bgcolor: 'rgba(212,175,55,0.12)',
              border: '1px solid rgba(184,134,11,0.25)',
              color: '#8B6914',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.3,
              px: 1.5,
              py: 0.5,
              borderRadius: '999px',
            }}
          >
            <AutoStoriesIcon sx={{ fontSize: 13 }} />
            <span>חיזוק יומי</span>
          </Box>
        </Box>

        {/* הגוויל עצמו — ברוחב מלא של המודאל, עם aspect-ratio */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '700 / 1040',
            backgroundImage: `url(${PARCHMENT_BG_URL})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center top',
            borderRadius: '10px',
            animation: `${softGoldPulse} 4s ease-in-out infinite`,
            mb: 2,
          }}
        >
          {/* "החיזוק היומי" על החלק המגולגל בראש */}
          <Typography
            id="daily-faith-title"
            sx={{
              position: 'absolute',
              top: '14.5%',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: { xs: 11, sm: 12.5 },
              fontWeight: 800,
              color: '#5D3A0A',
              fontFamily: '"Frank Ruhl Libre", "David Libre", serif',
              letterSpacing: 2,
              whiteSpace: 'nowrap',
              textShadow: '0 1px 0 rgba(255,230,180,0.5)',
              opacity: 0.88,
            }}
          >
            החיזוק היומי
          </Typography>

          {/* "בס״ד" בתוך אזור הכתיבה של הקלף */}
          <Typography
            sx={{
              position: 'absolute',
              top: '30%',
              right: '21%',
              fontSize: { xs: 9, sm: 10 },
              fontWeight: 700,
              color: '#3E2F0E',
              fontFamily: '"Frank Ruhl Libre", "David Libre", serif',
              opacity: 0.75,
            }}
          >
            בס״ד
          </Typography>

          {/* אזור הטקסט — מוגבל בגבולות של הגוויל, עם line-clamp וחיתוך מילים חכם */}
          <Box
            sx={{
              position: 'absolute',
              top: '35%',
              bottom: '37%',
              left: '17%',
              right: '17%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 12, sm: 13.5 },
                fontWeight: 500,
                lineHeight: 1.5,
                color: '#3E2F0E',
                fontFamily: '"Frank Ruhl Libre", "David Libre", "Times New Roman", serif',
                whiteSpace: 'pre-wrap',
                // wrapping חכם - שובר כל מקום צריך כדי לא לגלוש
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                hyphens: 'auto',
                letterSpacing: 0.15,
                // חיתוך 7 שורות עם ... אם הטקסט ארוך מדי
                display: '-webkit-box',
                WebkitLineClamp: 7,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                width: '100%',
              }}
            >
              {text}
            </Typography>
          </Box>
        </Box>

        {/* כפתור רוחב מלא בסגנון של InviteModal */}
        <Button
          fullWidth
          onClick={handleClose}
          sx={{
            borderRadius: '14px',
            py: 1.25,
            background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 50%, #B8860B 100%)',
            color: 'white',
            fontWeight: 800,
            fontSize: 14.5,
            textTransform: 'none',
            letterSpacing: 0.5,
            boxShadow: '0 4px 14px rgba(184,134,11,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,220,130,0.3)',
            transition: 'transform 0.12s, box-shadow 0.2s',
            '&:hover': {
              background: 'linear-gradient(135deg, #9C7209 0%, #B8860B 50%, #9C7209 100%)',
              boxShadow: '0 6px 18px rgba(184,134,11,0.5)',
            },
            '&:active': { transform: 'scale(0.98)' },
          }}
        >
          {t('dailyFaithReadButton')}
        </Button>
      </Box>
    </>
  );
};
