import { memo, useState, useCallback, useEffect } from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { haptic, safeStorage } from '../../global/helpers';
import { useSettings } from '../../global/context/SettingsContext';

const STORAGE_KEY = 'sb_onboarding_done';

interface Slide {
  emoji: string;
  bgGradient: string;
  title: string;
  description: string;
}

// 3 שקפים שמציגים את הפיצ'רים העיקריים. emoji-based כדי לא להוסיף תלות בנכסים גרפיים.
const slides: Slide[] = [
  {
    emoji: '🛒',
    bgGradient: 'linear-gradient(135deg, #14B8A6, #10B981)',
    title: 'ברוכים הבאים לסל החכם',
    description: 'נהלו רשימות קניות חכמות, לבד או עם המשפחה - הכל מסונכרן בזמן אמת.',
  },
  {
    emoji: '👥',
    bgGradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    title: 'משתפים בקבוצה',
    description: 'הוסיפו, סמנו וערכו ביחד. כולם רואים מי הוסיף מה ומה כבר נקנה.',
  },
  {
    emoji: '💰',
    bgGradient: 'linear-gradient(135deg, #F59E0B, #EF4444)',
    title: 'משווים מחירים',
    description: 'גלו איפה הסל הכי זול - מתעדכן אוטומטית מ-9 רשתות מובילות.',
  },
];

interface OnboardingGateProps {
  enabled: boolean;
}

export const OnboardingGate = memo(({ enabled }: OnboardingGateProps) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [show, show_setShow] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // הצגה רק למשתמש חדש (בלי דגל ב-localStorage), ורק כשהאימות הסתיים
  useEffect(() => {
    if (!enabled) return;
    if (safeStorage.get(STORAGE_KEY) === '1') return;
    show_setShow(true);
  }, [enabled]);

  const finish = useCallback(() => {
    safeStorage.set(STORAGE_KEY, '1');
    show_setShow(false);
  }, []);

  const handleNext = useCallback(() => {
    haptic('light');
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      finish();
    }
  }, [currentSlide, finish]);

  const handleSkip = useCallback(() => {
    haptic('light');
    finish();
  }, [finish]);

  if (!show) return null;

  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;

  return (
    <Box
      sx={{
        position: 'fixed', inset: 0,
        bgcolor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        p: 2,
        animation: 'fadeIn 0.3s ease-out',
        '@keyframes fadeIn': {
          from: { opacity: 0 }, to: { opacity: 1 },
        },
      }}
    >
      <Box sx={{
        width: '100%', maxWidth: 380,
        bgcolor: 'background.paper',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        '@keyframes slideUp': {
          from: { opacity: 0, transform: 'translateY(20px) scale(0.95)' },
          to: { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
      }}>
        {/* כפתור דילוג בפינה */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton
            size="small"
            onClick={handleSkip}
            aria-label="דילוג"
            sx={{ color: 'text.disabled' }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* אייקון מרכזי - האנימציה מתחלפת בכל מעבר שקף */}
        <Box
          key={currentSlide}
          sx={{
            mx: 'auto',
            width: 140, height: 140,
            borderRadius: '50%',
            background: slide.bgGradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 70,
            mb: 3,
            boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
            animation: 'bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            '@keyframes bounce': {
              '0%': { transform: 'scale(0.5) rotate(-10deg)', opacity: 0 },
              '60%': { transform: 'scale(1.1) rotate(5deg)' },
              '100%': { transform: 'scale(1) rotate(0)', opacity: 1 },
            },
          }}
          role="img"
          aria-label={slide.title}
        >
          {slide.emoji}
        </Box>

        {/* תוכן */}
        <Box sx={{ px: 3, pb: 2.5, textAlign: 'center' }}>
          <Typography
            key={`title-${currentSlide}`}
            sx={{
              fontSize: 22, fontWeight: 800, mb: 1.25,
              animation: 'fadeIn 0.4s 0.1s both',
            }}
          >
            {slide.title}
          </Typography>
          <Typography
            key={`desc-${currentSlide}`}
            sx={{
              fontSize: 14.5, color: 'text.secondary', lineHeight: 1.55,
              minHeight: 48,
              animation: 'fadeIn 0.4s 0.15s both',
            }}
          >
            {slide.description}
          </Typography>
        </Box>

        {/* נקודות התקדמות */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.75, mb: 2.5 }}>
          {slides.map((_, i) => (
            <Box
              key={i}
              onClick={() => { haptic('light'); setCurrentSlide(i); }}
              sx={{
                width: i === currentSlide ? 24 : 8,
                height: 8,
                borderRadius: '4px',
                bgcolor: i === currentSlide ? 'primary.main' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
                transition: 'width 0.3s ease, background-color 0.3s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </Box>

        {/* כפתור */}
        <Box sx={{ p: 2.5, pt: 0 }}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleNext}
            sx={{
              py: 1.5,
              borderRadius: '14px',
              fontSize: 15,
              fontWeight: 800,
              textTransform: 'none',
              boxShadow: '0 6px 20px rgba(20,184,166,0.35)',
            }}
          >
            {isLast ? 'בואו נתחיל!' : 'הבא'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
});

OnboardingGate.displayName = 'OnboardingGate';
