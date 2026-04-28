import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { haptic, safeStorage } from '../../global/helpers';
import { useSettings } from '../../global/context/SettingsContext';

const STORAGE_KEY = 'sb_onboarding_done';

type SlideKey = 'lists' | 'group' | 'prices';

interface Slide {
  key: SlideKey;
  bgGradient: string;
  glowColor: string;
  title: string;
  subtitle: string;
  features: Feature[];
}

// כל פיצ'ר מקבל אימוג'י משלו במקום ✓ גנרי - עוזר לקריאות והתמצאות מהירה
interface Feature { icon: string; text: string }

const slides: Slide[] = [
  {
    key: 'lists',
    bgGradient: 'linear-gradient(135deg, #14B8A6 0%, #10B981 60%, #059669 100%)',
    glowColor: 'rgba(16,185,129,0.45)',
    title: 'רשימות חכמות',
    subtitle: 'הוסיפו, סמנו ושכחו מהמשימות',
    features: [
      { icon: '🤖', text: 'זיהוי קטגוריה אוטומטי בעת ההקלדה' },
      { icon: '👆', text: 'החלקה צדדית = ערוך / סמן / מחק' },
      { icon: '⚡', text: 'מהיר וזריז, מותאם לכל מסך' },
    ],
  },
  {
    key: 'group',
    bgGradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 60%, #A855F7 100%)',
    glowColor: 'rgba(139,92,246,0.45)',
    title: 'משפחה ביחד',
    subtitle: 'כל אחד תורם, כולם רואים בזמן אמת',
    features: [
      { icon: '👀', text: 'מי הוסיף, מי קנה, מתי — הכל ברור' },
      { icon: '🔔', text: 'התראות חכמות רק כשרלוונטי' },
      { icon: '📱', text: 'הזמנת חברים בקוד או QR' },
    ],
  },
  {
    key: 'prices',
    bgGradient: 'linear-gradient(135deg, #F59E0B 0%, #F97316 60%, #EF4444 100%)',
    glowColor: 'rgba(245,158,11,0.5)',
    title: 'חוסכים בענק',
    subtitle: 'תדעו תמיד איפה הכי זול',
    features: [
      { icon: '🛒', text: 'השוואת מחירים מ-10 רשתות מובילות' },
      { icon: '📍', text: 'הסניף הקרוב אליכם, ניווט בלחיצה' },
      { icon: '🔄', text: 'מתעדכן אוטומטית פעם ביום' },
    ],
  },
];

// ======= דוגמאות mockup חיות מתוך האפליקציה =======
// כל preview מציג תצוגה מוקטנת של פיצ'ר אמיתי, עם הצבעים והעיצוב של האפליקציה.

const ListPreview = memo(({ isDark }: { isDark: boolean }) => {
  const items: Array<{ icon: string; name: string; qty: string; done: boolean; color: string }> = [
    { icon: '🥛', name: 'חלב 3% תנובה', qty: '2 ליטר', done: false, color: '#3B82F6' },
    { icon: '🍞', name: 'לחם פרוס', qty: '1 יח׳', done: true, color: '#A16207' },
    { icon: '🥕', name: 'גזר אורגני', qty: '1 ק״ג', done: false, color: '#F97316' },
  ];
  return (
    <Box sx={{
      width: 232,
      bgcolor: isDark ? '#1F2937' : '#FFFFFF',
      borderRadius: '14px',
      p: 1.25,
      boxShadow: '0 12px 32px rgba(16,185,129,0.25), 0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    }}>
      {/* שורת כותרת */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1 }}>
        <Box sx={{ width: 24, height: 24, borderRadius: '7px', bgcolor: '#14B8A6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🛒</Box>
        <Typography sx={{ fontSize: 12, fontWeight: 800, flex: 1 }}>קניות לסופ״ש</Typography>
        <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#22C55E', fontSize: 10, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>3</Box>
      </Box>
      {items.map((it, i) => (
        <Box key={i} sx={{
          display: 'flex', alignItems: 'center', gap: 0.85,
          py: 0.65, px: 0.6, mb: 0.4,
          borderRadius: '8px',
          bgcolor: it.done ? (isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6') : 'transparent',
          opacity: it.done ? 0.7 : 1,
        }}>
          <Box sx={{
            width: 26, height: 26, borderRadius: '7px',
            bgcolor: `${it.color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
          }}>{it.icon}</Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{
              fontSize: 11, fontWeight: 700,
              textDecoration: it.done ? 'line-through' : 'none',
              color: it.done ? 'text.secondary' : 'text.primary',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{it.name}</Typography>
            <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>{it.qty}</Typography>
          </Box>
          {it.done && <Typography sx={{ fontSize: 13 }}>✅</Typography>}
        </Box>
      ))}
    </Box>
  );
});
ListPreview.displayName = 'ListPreview';

const GroupPreview = memo(({ isDark }: { isDark: boolean }) => {
  const members = [
    { name: 'דנה', color: '#EC4899', emoji: '👩' },
    { name: 'יוסי', color: '#3B82F6', emoji: '👨' },
    { name: 'אני', color: '#14B8A6', emoji: '😊' },
  ];
  const events = [
    { who: 'דנה', what: 'הוסיפה', item: 'גבינה צהובה', time: 'עכשיו', color: '#EC4899' },
    { who: 'יוסי', what: 'סימן כנקנה', item: 'יין אדום', time: 'לפני 2 דק׳', color: '#3B82F6' },
  ];
  return (
    <Box sx={{
      width: 240,
      bgcolor: isDark ? '#1F2937' : '#FFFFFF',
      borderRadius: '14px',
      p: 1.25,
      boxShadow: '0 12px 32px rgba(139,92,246,0.3), 0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    }}>
      {/* ראש קבוצה - אווטרים */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1 }}>
        <Box sx={{ width: 24, height: 24, borderRadius: '7px', bgcolor: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>👥</Box>
        <Typography sx={{ fontSize: 12, fontWeight: 800, flex: 1 }}>משפחת כהן</Typography>
        <Box sx={{ display: 'flex' }}>
          {members.map((m, i) => (
            <Box key={i} sx={{
              width: 22, height: 22, borderRadius: '50%', bgcolor: m.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: 'white', fontWeight: 800,
              border: '2px solid', borderColor: isDark ? '#1F2937' : '#FFFFFF',
              ml: i === 0 ? 0 : '-7px',
              zIndex: members.length - i,
            }}>{m.emoji}</Box>
          ))}
        </Box>
      </Box>
      {/* פיד פעילות */}
      {events.map((e, i) => (
        <Box key={i} sx={{
          display: 'flex', alignItems: 'flex-start', gap: 0.75,
          py: 0.55, px: 0.5, mb: 0.35,
          borderRadius: '8px',
          bgcolor: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.05)',
        }}>
          <Box sx={{
            width: 6, height: 6, borderRadius: '50%', bgcolor: e.color,
            mt: 0.55, flexShrink: 0,
          }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 10.5, lineHeight: 1.35 }}>
              <Typography component="span" sx={{ fontWeight: 800, color: e.color }}>{e.who}</Typography>{' '}
              <Typography component="span" sx={{ color: 'text.secondary' }}>{e.what}</Typography>{' '}
              <Typography component="span" sx={{ fontWeight: 700 }}>{e.item}</Typography>
            </Typography>
            <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>{e.time}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
});
GroupPreview.displayName = 'GroupPreview';

const PricesPreview = memo(({ isDark }: { isDark: boolean }) => {
  const chains = [
    { name: 'רמי לוי', total: 142, isWinner: true },
    { name: 'שופרסל', total: 168, isWinner: false },
    { name: 'יינות ביתן', total: 174, isWinner: false },
  ];
  return (
    <Box sx={{
      width: 240,
      bgcolor: isDark ? '#1F2937' : '#FFFFFF',
      borderRadius: '14px',
      p: 1.25,
      boxShadow: '0 12px 32px rgba(245,158,11,0.3), 0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    }}>
      {/* hero מוקטן */}
      <Box sx={{
        p: 1, mb: 0.85, borderRadius: '10px',
        background: 'linear-gradient(135deg, #14B8A6, #10B981)',
        color: 'white',
      }}>
        <Typography sx={{ fontSize: 9, fontWeight: 800, opacity: 0.9 }}>תחסוך עד</Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>₪32</Typography>
        <Typography sx={{ fontSize: 9, opacity: 0.9, mt: 0.15 }}>ברמי לוי המרכזי</Typography>
      </Box>
      {/* כרטיסי רשת */}
      {chains.map((c, i) => (
        <Box key={i} sx={{
          display: 'flex', alignItems: 'center', gap: 0.75,
          py: 0.6, px: 0.85, mb: 0.4,
          borderRadius: '9px',
          bgcolor: c.isWinner ? 'rgba(16,185,129,0.1)' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
          border: '1px solid', borderColor: c.isWinner ? 'rgba(16,185,129,0.35)' : 'transparent',
        }}>
          <Box sx={{
            width: 22, height: 22, borderRadius: '50%',
            background: c.isWinner ? 'linear-gradient(135deg, #FCD34D, #F59E0B)' : 'rgba(20,184,166,0.1)',
            color: c.isWinner ? 'white' : '#0F766E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: c.isWinner ? 12 : 10, fontWeight: 900,
            flexShrink: 0,
          }}>
            {c.isWinner ? '👑' : i + 1}
          </Box>
          <Typography sx={{ fontSize: 11, fontWeight: 800, flex: 1, color: c.isWinner ? '#059669' : 'text.primary' }}>
            {c.name}
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: c.isWinner ? '#059669' : 'text.primary' }}>
            ₪{c.total}
          </Typography>
        </Box>
      ))}
    </Box>
  );
});
PricesPreview.displayName = 'PricesPreview';

const renderPreview = (key: SlideKey, isDark: boolean) => {
  if (key === 'lists') return <ListPreview isDark={isDark} />;
  if (key === 'group') return <GroupPreview isDark={isDark} />;
  return <PricesPreview isDark={isDark} />;
};

const SWIPE_THRESHOLD = 50;

interface OnboardingGateProps {
  enabled: boolean;
}

export const OnboardingGate = memo(({ enabled }: OnboardingGateProps) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [show, setShow] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  // RTL: "הבא" צריך להחליק מימין לשמאל ויזואלית. במקום לחשב, אני סומך על direction
  // הוא רק לקביעת אנימציה (slideInLeft/slideInRight של החלפת התוכן).
  const swipeStartX = useRef(0);
  const swipeActive = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (safeStorage.get(STORAGE_KEY) === '1') return;
    // הגנה מהדפלוי: אם הופעל בסשן הזה (טאב הזה) - לא נראה שוב גם אחרי reload של ה-SW
    try { if (sessionStorage.getItem('sb_onboarding_session_shown') === '1') return; } catch { /* */ }
    try { sessionStorage.setItem('sb_onboarding_session_shown', '1'); } catch { /* */ }
    setShow(true);
  }, [enabled]);

  const finish = useCallback(() => {
    haptic('medium');
    safeStorage.set(STORAGE_KEY, '1');
    setShow(false);
  }, []);

  const goToSlide = useCallback((idx: number) => {
    setDirection(idx > currentSlide ? 'next' : 'prev');
    setCurrentSlide(idx);
  }, [currentSlide]);

  const handleNext = useCallback(() => {
    haptic('light');
    if (currentSlide < slides.length - 1) {
      setDirection('next');
      setCurrentSlide(currentSlide + 1);
    } else {
      finish();
    }
  }, [currentSlide, finish]);

  const handlePrev = useCallback(() => {
    if (currentSlide > 0) {
      haptic('light');
      setDirection('prev');
      setCurrentSlide(currentSlide - 1);
    }
  }, [currentSlide]);

  // Swipe horizontal - בתנועה אופקית >50px מחליף שקף
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeActive.current = true;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeActive.current) return;
    swipeActive.current = false;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    // RTL: swipe ימינה (dx>0) = הקודם, swipe שמאלה (dx<0) = הבא
    if (dx < 0) handleNext();
    else handlePrev();
  }, [handleNext, handlePrev]);

  if (!show) return null;

  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;
  const isFirst = currentSlide === 0;
  // אנימציית כניסה לתוכן: בכניסה ל"הבא" התוכן בא משמאל, ב"הקודם" מימין (RTL)
  const slideAnimation = direction === 'next' ? 'slideFromLeft' : 'slideFromRight';

  return (
    <Box
      sx={{
        position: 'fixed', inset: 0,
        bgcolor: isDark ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        p: 2,
        animation: 'obFadeIn 0.35s ease-out',
        '@keyframes obFadeIn': {
          from: { opacity: 0 }, to: { opacity: 1 },
        },
        // מסכים זעירים - padding 0.75 כדי לתת מקום מקסימלי לקלף
        '@media (max-width: 360px)': { p: 1 },
        '@media (max-width: 320px)': { p: 0.5 },
        // Landscape - אין מרווח גדול, הקלף לוקח כמעט את כל המסך
        '@media (orientation: landscape) and (max-height: 500px)': { p: 0.5, alignItems: 'flex-start' },
      }}
    >
      <Box
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        sx={{
          position: 'relative',
          width: '100%', maxWidth: 400,
          maxHeight: '100%',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          bgcolor: 'background.paper',
          borderRadius: '28px',
          overflow: 'auto',
          boxShadow: `0 24px 70px ${slide.glowColor}, 0 8px 24px rgba(0,0,0,0.2)`,
          animation: 'obSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          '@media (max-width: 360px)': { borderRadius: '20px' },
          '@media (max-width: 320px)': { borderRadius: '16px' },
          '@media (orientation: landscape) and (max-height: 500px)': {
            borderRadius: '14px',
            maxHeight: '95vh',
          },
          transition: 'box-shadow 0.5s ease',
          '@keyframes obSlideUp': {
            from: { opacity: 0, transform: 'translateY(30px) scale(0.92)' },
            to: { opacity: 1, transform: 'translateY(0) scale(1)' },
          },
          '@keyframes slideFromLeft': {
            from: { opacity: 0, transform: 'translateX(-30px)' },
            to: { opacity: 1, transform: 'translateX(0)' },
          },
          '@keyframes slideFromRight': {
            from: { opacity: 0, transform: 'translateX(30px)' },
            to: { opacity: 1, transform: 'translateX(0)' },
          },
          '@keyframes obFloat': {
            '0%, 100%': { transform: 'translateY(0) rotate(-4deg)', opacity: 0.85 },
            '50%': { transform: 'translateY(-10px) rotate(4deg)', opacity: 1 },
          },
          '@keyframes obPulse': {
            '0%, 100%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.06)' },
          },
          '@keyframes obBounce': {
            '0%': { transform: 'scale(0.4) rotate(-15deg)', opacity: 0 },
            '60%': { transform: 'scale(1.1) rotate(8deg)' },
            '100%': { transform: 'scale(1) rotate(0)', opacity: 1 },
          },
        }}
      >
        {/* פס gradient עליון - רמז ויזואלי לצבע השקף */}
        <Box sx={{
          height: 4,
          background: slide.bgGradient,
          transition: 'background 0.5s ease',
        }} />

        {/* כפתורי שליטה - חזור משמאל, X מימין */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, pt: 1 }}>
          {/* כפתור חזרה - מוצג רק משקף 2 והלאה */}
          <Box sx={{ width: 36 }}>
            {!isFirst && (
              <IconButton
                size="small"
                onClick={handlePrev}
                aria-label="חזרה"
                sx={{
                  color: 'text.secondary',
                  width: 36, height: 36,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 20, transform: 'scaleX(-1)' }} />
              </IconButton>
            )}
          </Box>

          {/* counter עדין */}
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', letterSpacing: 0.4 }}>
            {currentSlide + 1} מתוך {slides.length}
          </Typography>

          <IconButton
            size="small"
            onClick={() => { haptic('light'); finish(); }}
            aria-label="דילוג"
            sx={{
              color: 'text.disabled',
              width: 36, height: 36,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* תצוגה חיה של הפיצ'ר - מוקאפ של מסך אמיתי באפליקציה */}
        <Box sx={{
          position: 'relative',
          mx: 'auto', mt: 1.5, mb: 0.5,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          minHeight: 200,
          '@media (max-width: 360px)': { minHeight: 160, mt: 1, mb: 0.25, transform: 'scale(0.88)' },
          '@media (max-width: 320px)': { minHeight: 140, mt: 0.5, transform: 'scale(0.78)' },
          '@media (orientation: landscape) and (max-height: 500px)': { minHeight: 0, transform: 'scale(0.6)', mt: 0, mb: -2 },
        }}>
          {/* halo gradient רקע - מטשטש לאחור */}
          <Box sx={{
            position: 'absolute', inset: '-10% 10%',
            background: slide.bgGradient,
            opacity: 0.18,
            filter: 'blur(28px)',
            borderRadius: '40%',
            animation: 'obPulse 3.5s ease-in-out infinite',
          }} />
          {/* Preview - מוקאפ */}
          <Box
            key={`preview-${currentSlide}`}
            sx={{
              position: 'relative',
              animation: 'obBounce 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: 'rotate(-2deg)',
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'rotate(0deg)' },
            }}
          >
            {renderPreview(slide.key, isDark)}
          </Box>
        </Box>

        {/* תוכן */}
        <Box
          key={`content-${currentSlide}`}
          sx={{
            px: 3, mt: 1,
            animation: `${slideAnimation} 0.4s ease-out`,
            '@media (max-width: 360px)': { px: 2, mt: 0.5 },
            '@media (max-width: 320px)': { px: 1.5, mt: 0.25 },
          }}
        >
          <Typography sx={{
            fontSize: 26, fontWeight: 900, textAlign: 'center', lineHeight: 1.15,
            background: slide.bgGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 0.5,
            '@media (max-width: 360px)': { fontSize: 22 },
            '@media (max-width: 320px)': { fontSize: 19 },
            '@media (orientation: landscape) and (max-height: 500px)': { fontSize: 18, mb: 0.25 },
          }}>
            {slide.title}
          </Typography>
          <Typography sx={{
            fontSize: 14, color: 'text.secondary', textAlign: 'center', mb: 2.25, fontWeight: 600,
            '@media (max-width: 360px)': { fontSize: 12.5, mb: 1.5 },
            '@media (max-width: 320px)': { fontSize: 11.5, mb: 1 },
            '@media (orientation: landscape) and (max-height: 500px)': { fontSize: 11, mb: 0.75 },
          }}>
            {slide.subtitle}
          </Typography>

          {/* רשימת פיצ'רים עם check */}
          <Box sx={{
            display: 'flex', flexDirection: 'column', gap: 1, mb: 2.5,
            '@media (max-width: 360px)': { gap: 0.5, mb: 1.5 },
            '@media (max-width: 320px)': { gap: 0.4, mb: 1.25 },
          }}>
            {slide.features.map((feature, i) => (
              <Box
                key={`${currentSlide}-feat-${i}`}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.25,
                  py: 0.75, px: 1.25,
                  borderRadius: '10px',
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
                  animation: `${slideAnimation} 0.4s ease-out ${i * 0.08}s both`,
                  '@media (max-width: 360px)': { py: 0.5, px: 0.85, gap: 0.85, borderRadius: '8px' },
                  '@media (max-width: 320px)': { py: 0.35, px: 0.65, gap: 0.65 },
                }}
              >
                <Box sx={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: slide.bgGradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 2px 6px ${slide.glowColor}`,
                  fontSize: 12, fontWeight: 900, color: 'white',
                  '@media (max-width: 360px)': { width: 18, height: 18, fontSize: 10 },
                  '@media (max-width: 320px)': { width: 16, height: 16, fontSize: 9 },
                }}>
                  ✓
                </Box>
                <Typography sx={{
                  fontSize: 13, fontWeight: 600, color: 'text.primary', flex: 1, lineHeight: 1.4,
                  '@media (max-width: 360px)': { fontSize: 11.5 },
                  '@media (max-width: 320px)': { fontSize: 10.5 },
                }}>
                  {feature}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* progress dots */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.85, mb: 2 }}>
          {slides.map((s, i) => (
            <Box
              key={i}
              onClick={() => { haptic('light'); goToSlide(i); }}
              sx={{
                width: i === currentSlide ? 28 : 8,
                height: 8,
                borderRadius: '4px',
                background: i === currentSlide ? s.bgGradient : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
                transition: 'width 0.35s ease, background 0.35s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </Box>

        {/* כפתור CTA */}
        <Box sx={{ p: 2.5, pt: 0 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleNext}
            startIcon={isLast ? <RocketLaunchIcon sx={{ fontSize: 20 }} /> : null}
            sx={{
              py: 1.6,
              borderRadius: '14px',
              fontSize: 15.5,
              fontWeight: 800,
              textTransform: 'none',
              background: slide.bgGradient,
              boxShadow: `0 8px 24px ${slide.glowColor}`,
              transition: 'all 0.3s ease',
              '&:hover': { background: slide.bgGradient, filter: 'brightness(1.08)' },
              '&:active': { transform: 'scale(0.98)' },
              '& .MuiButton-startIcon': { mr: 0.6 },
            }}
          >
            {isLast ? 'יאללה, מתחילים!' : 'הבא'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
});

OnboardingGate.displayName = 'OnboardingGate';
