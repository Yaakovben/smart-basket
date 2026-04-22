import { useEffect, useRef, useLayoutEffect, useState } from 'react';
import { Box, Typography, Button, keyframes } from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { useSettings } from '../../global/context/SettingsContext';
import { haptic } from '../../global/helpers';

const PARCHMENT_BG_URL = '/daily-faith/parchment.jpg';

// ===== הגדרות קבועות של אזורי הטקסט על תמונת הגוויל =====
// כל הערכים באחוזים מגובה/רוחב הקונטיינר של התמונה.
// המספרים נמדדו מהתמונה הספציפית. אם מחליפים תמונה — לעדכן כאן.
const SCROLL_LAYOUT = {
  // אזור הטקסט — ממורכז בדיוק בתוך השטח החלק של הגוויל (אחרי הגליל העליון, לפני התחתון).
  // top+bottom מגדירים את גבולות העל/תחת של השטח הפתוח.
  // left+right סימטריים כדי לשמור מרכוז אופקי מושלם.
  body: { top: '30%', bottom: '34%', left: '22%', right: '22%' },
  // מקדמים דינמיים — הגודל מחושב לפי רוחב האזור בפועל, לא ערך קבוע בפיקסלים
  fontMinRatio: 0.05,  // 5% מרוחב התיבה
  fontMaxRatio: 0.11,  // 11% מרוחב התיבה
  fontAbsoluteMin: 9,  // רצפה מוחלטת - לא קטן מזה גם על מסכים זעירים
} as const;

interface DailyFaithPopupProps {
  text: string;
  onClose: () => void;
}

const overlaySx = {
  position: 'fixed' as const,
  inset: 0,
  bgcolor: 'rgba(0,0,0,0.55)',
  zIndex: 1000,
  backdropFilter: 'blur(5px)',
  touchAction: 'none' as const,
};

const containerSx = {
  position: 'fixed' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  borderRadius: '20px',
  p: 2.5,
  zIndex: 1001,
  width: '94%',
  maxWidth: 420,
  boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  overscrollBehavior: 'contain' as const,
  // 95vh במצב רגיל, dvh (dynamic viewport) לסמארטפונים עם חלל כתובת משתנה
  maxHeight: 'min(95dvh, 95vh)',
  overflowY: 'auto' as const,
  // נייד צר - פחות padding ו-border radius
  '@media (max-width: 360px)': { p: 1.75, borderRadius: '16px', maxWidth: 340 },
  // מצב landscape - מגביל גובה חזק יותר כדי שהתמונה לא תתפוס את כל המסך
  '@media (orientation: landscape) and (max-height: 500px)': {
    maxHeight: '92dvh',
    p: 1.5,
  },
};

const softGoldPulse = keyframes`
  0%, 100% { box-shadow: 0 4px 14px rgba(0,0,0,0.2); }
  50%      { box-shadow: 0 6px 18px rgba(0,0,0,0.25), 0 0 24px rgba(212,175,55,0.3); }
`;

// Hook - מתאים את גודל הטקסט כדי שימלא את התיבה בדיוק, בלי לגלוש
// עובד גנרית: טקסט קצר יהיה גדול, טקסט ארוך יתכווץ. מגיב ל-resize של המסך.
function useAutoFitFontSize(text: string, containerRef: React.RefObject<HTMLDivElement | null>) {
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number>(14);

  useLayoutEffect(() => {
    const el = textRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const fit = () => {
      // גודל פונט דינמי: מחושב לפי רוחב התיבה בפועל, לא ערך קבוע.
      // תיבה קטנה -> טווח קטן, תיבה גדולה -> טווח גדול, יחסית לרוחב.
      const w = container.clientWidth;
      const rawMin = Math.round(w * SCROLL_LAYOUT.fontMinRatio);
      const rawMax = Math.round(w * SCROLL_LAYOUT.fontMaxRatio);
      const lo0 = Math.max(SCROLL_LAYOUT.fontAbsoluteMin, rawMin);
      const hi0 = Math.max(lo0, rawMax);

      // חיפוש בינארי של הגודל המקסימלי שמכניס את הטקסט בתיבה
      let lo = lo0;
      let hi = hi0;
      let best = lo;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) * 2) / 2; // חצאי פיקסלים
        el.style.fontSize = `${mid}px`;
        const fits =
          el.scrollHeight <= container.clientHeight &&
          el.scrollWidth <= container.clientWidth;
        if (fits) {
          best = mid;
          lo = mid + 0.5;
        } else {
          hi = mid - 0.5;
        }
      }
      el.style.fontSize = `${best}px`;
      // line-height דינמי: טקסט גדול -> ריווח צפוף יותר, קטן -> ריווח רחב יותר לקריאה
      el.style.lineHeight = best >= 16 ? '1.45' : best >= 12 ? '1.55' : '1.65';
      setFontSize(best);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [text, containerRef]);

  return { textRef, fontSize };
}

export const DailyFaithPopup = ({ text, onClose }: DailyFaithPopupProps) => {
  const { t } = useSettings();
  const bodyContainerRef = useRef<HTMLDivElement>(null);
  const { textRef } = useAutoFitFontSize(text, bodyContainerRef);

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
      <Box sx={overlaySx} aria-hidden="true" />

      <Box sx={containerSx} role="dialog" aria-labelledby="daily-faith-title">
        {/* הגוויל - תמונה כאלמנט אמיתי כך שהקופסה מתאימה בדיוק לממדיו.
            כל האלמנטים בתוך האחוזים שלמטה מתמקמים לפי התמונה בדיוק, בלי letterboxing. */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            borderRadius: '10px',
            overflow: 'hidden',
            animation: `${softGoldPulse} 4s ease-in-out infinite`,
            mb: 1.5,
            lineHeight: 0,
          }}
        >
          <Box
            component="img"
            src={PARCHMENT_BG_URL}
            alt=""
            sx={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none', pointerEvents: 'none' }}
            draggable={false}
          />
          {/* אזור הטקסט - קופסה מוגדרת היטב, האוטו-פיט מתאים גודל לתוכו */}
          <Box
            ref={bodyContainerRef}
            id="daily-faith-title"
            sx={{
              position: 'absolute',
              top: SCROLL_LAYOUT.body.top,
              bottom: SCROLL_LAYOUT.body.bottom,
              left: SCROLL_LAYOUT.body.left,
              right: SCROLL_LAYOUT.body.right,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              overflow: 'hidden',
            }}
          >
            <Typography
              ref={textRef}
              sx={{
                fontWeight: 500,
                color: '#3E2F0E',
                fontFamily: '"Frank Ruhl Libre", "David Libre", "Times New Roman", serif',
                // pre-wrap: שומר רווחים אבל מאפשר גלישת שורות אוטומטית בין מילים.
                // ללא overflowWrap/wordBreak — כך מילים לא ייחתכו באמצע.
                whiteSpace: 'pre-wrap',
                wordBreak: 'keep-all',        // לא שובר מילים לעולם
                overflowWrap: 'normal',       // לא שובר גם אם מילה ארוכה מהשורה
                hyphens: 'none',              // ללא מקפים אוטומטיים
                letterSpacing: 0.1,
                width: '100%',
                // text-wrap: balance שובר שורות בצורה מאוזנת בין מילים
                textWrap: 'balance',
                // מונע התאמת קנה-מידה אוטומטי של iOS שעשוי להתנגש עם ה-auto-fit
                WebkitTextSizeAdjust: '100%',
              }}
            >
              {text}
            </Typography>
          </Box>
        </Box>

        {/* תגית "חיזוק יומי" - מתחת לגוויל, מעל הכפתור */}
        <Box sx={{ textAlign: 'center', mb: 1.5 }}>
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
