import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useSettings } from '../../global/context/SettingsContext';
import { haptic } from '../../global/helpers';
import { modalOverlaySx, modalContainerSx } from '../list/helpers/listModalStyles';
import { FEATURE_TIPS } from './tips';

interface FeatureTipsPopupProps {
  onClose: () => void;
}

// קרוסלת "ידעת ש...?" - כרטיס מלבני יחיד (לא מסך מלא), במרכז המסך - אותו
// overlay/מיקום מדויק כמו מודאל שיתוף רשימה (modalOverlaySx/modalContainerSx,
// ראו ShareListModal) כדי שכל הפופאפים ה"צפים" באפליקציה יתנהגו אחיד. X
// קבוע בפינה השמאלית-העליונה. בפנים - כל הטיפים זמינים לדפדוף (swipe/
// נקודות/כפתור) בישיבה אחת, כדי שמי שסקרן יוכל לעבור על כולם, ומי שלא -
// יכול לסגור בכל רגע. גלילה אופקית native (scroll-snap) + IntersectionObserver
// לזיהוי הטיפ הפעיל כשגוללים ביד - נמנע מחישובי scrollLeft ידניים (בעייתיים
// ב-RTL בין דפדפנים); ניווט תכנותי (נקודות/כפתור) דרך scrollIntoView.
export const FeatureTipsPopup = ({ onClose }: FeatureTipsPopupProps) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  // אחרי ניווט תכנותי (goTo) - מתעלמים מהתצפית עד שהיא "מסכימה" עם היעד,
  // כדי שהיא לא תדרוס עם ריבאונס-ביניים באמצע הגלילה החלקה. ראו goTo/
  // ה-observer למטה - זה מה שתיקן את "הכפתור עובד רק פעם אחת".
  const pendingIndexRef = useRef<number | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let bestIndex = -1;
        let bestRatio = 0;
        entries.forEach((entry) => {
          const idx = slideRefs.current.findIndex((el) => el === entry.target);
          if (idx === -1) return;
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = idx;
          }
        });
        if (bestIndex === -1 || bestRatio <= 0.5) return;
        // אם יש ניווט תכנותי בהמתנה - מתעלמים מכל תוצאה שאינה היעד עצמו
        // (ריבאונס/שכבת-ביניים בזמן הגלילה החלקה), אחרת activeIndex יכול
        // "להיתקע" על ערך ביניים ולגרום להקשה הבאה על "הבא" לדלג/להישאר.
        if (pendingIndexRef.current !== null && bestIndex !== pendingIndexRef.current) return;
        pendingIndexRef.current = null;
        setActiveIndex(bestIndex);
      },
      { root: track, threshold: [0.5, 0.75, 1] }
    );
    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // ניווט תכנותי (נקודה/כפתור "הבא") - מעדכן את activeIndex *מיידית*, לא
  // מחכה לאישור מה-IntersectionObserver (שמגיע רק כשהגלילה החלקה מסתיימת
  // בפועל, ~300-400ms מאוחר יותר). בלי זה: הקשה שנייה על "הבא" לפני
  // שהתצפית הספיקה לעדכן היתה מחשבת goTo(activeIndex+1) על ה-activeIndex
  // *הישן* - כלומר שוב על היעד שכבר הגענו אליו בהקשה הראשונה = לא נראה
  // עושה כלום. זה היה הבאג "הכפתור עובד רק פעם אחת".
  const goTo = (index: number) => {
    haptic('light');
    pendingIndexRef.current = index;
    setActiveIndex(index);
    slideRefs.current[index]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  const handleClose = () => { haptic('light'); onClose(); };
  const isLast = activeIndex === FEATURE_TIPS.length - 1;
  const active = FEATURE_TIPS[activeIndex];
  const ink = isDark ? active.ink.dark : active.ink.light;
  const glow = isDark ? active.glow.dark : active.glow.light;

  return (
    <>
      <Box sx={modalOverlaySx} onClick={handleClose} aria-hidden="true" />
      <Box
        role="dialog"
        aria-labelledby="tips-title"
        sx={{
          ...modalContainerSx,
          p: 0, maxWidth: 380,
          boxShadow: `0 26px 70px ${glow}, 0 2px 10px rgba(0,0,0,0.22)`,
          transition: 'box-shadow 0.35s ease',
          animation: 'tipsIn 0.42s cubic-bezier(0.16, 1, 0.3, 1) both',
          '@keyframes tipsIn': {
            from: { opacity: 0, transform: 'translate(-50%, calc(-50% + 14px)) scale(0.96)' },
            to: { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
          },
        }}
      >
        {/* X - קבוע בפינה הפיזית השמאלית-עליונה, מעל כל שקופית. צל עדין
            במקום "זכוכית" לבנה - הרקעים עכשיו רכים/בהירים, לא גרדיאנטים
            עזים, אז עיגול לבן שקוף לא היה מספיק קריא מעליהם. */}
        <Box
          role="button"
          tabIndex={0}
          aria-label={t('close')}
          onClick={handleClose}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClose(); } }}
          sx={{
            position: 'absolute', top: 14, left: 14, zIndex: 20,
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.75)',
            border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)',
            backdropFilter: 'blur(6px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.65)',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            transition: 'background-color 0.15s, transform 0.1s',
            '&:active': { transform: 'scale(0.9)' },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </Box>

        {/* כותרת קבועה + מונה - לא זזה בין שקופיות, מכוונת את המשתמש שיש כאן כמה טיפים */}
        <Box sx={{
          position: 'absolute', top: 20, left: 0, right: 0, zIndex: 15,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.75,
            px: 1.4, py: 0.45, borderRadius: '999px',
            bgcolor: isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.75)',
            border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)',
            backdropFilter: 'blur(6px)',
          }}>
            <Typography id="tips-title" sx={{ fontSize: 11, fontWeight: 800, color: ink, letterSpacing: 0.3 }}>
              {t('tipEyebrow')}
            </Typography>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: ink, opacity: 0.5 }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: ink, opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>
              {activeIndex + 1}/{FEATURE_TIPS.length}
            </Typography>
          </Box>
        </Box>

        {/* עוטפת clip - פינות מעוגלות לגרדיאנטי ה-hero (מלבניים) בלי
            להסתמך על overflow:hidden בקונטיינר החיצוני (שם overflowY:auto
            נשאר, למקרה של viewport קצר במיוחד). */}
        <Box sx={{ borderRadius: '20px', overflow: 'hidden' }}>
        {/* מסילת גלילה אופקית - כל טיפ תופס את כל רוחב הכרטיס, snap מלא */}
        <Box
          ref={trackRef}
          sx={{
            display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {FEATURE_TIPS.map((tip, i) => {
            const tipInk = isDark ? tip.ink.dark : tip.ink.light;
            return (
              <Box
                key={tip.id}
                ref={(el: HTMLDivElement | null) => { slideRefs.current[i] = el; }}
                sx={{ flex: '0 0 100%', minWidth: 0, scrollSnapAlign: 'start' }}
              >
                {/* ===== Hero ===== */}
                <Box sx={{
                  position: 'relative', overflow: 'hidden',
                  background: isDark ? tip.gradient.dark : tip.gradient.light,
                  px: 3, pt: 6.5, pb: 3.25,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}>
                  <Box
                    role="img"
                    aria-label=""
                    sx={{
                      position: 'relative', zIndex: 1,
                      width: 78, height: 78, borderRadius: '22px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 38, lineHeight: 1,
                      bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)',
                      border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.8)',
                      boxShadow: isDark
                        ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 24px rgba(0,0,0,0.3)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 24px rgba(15,23,42,0.08)',
                    }}
                  >
                    {tip.emoji}
                  </Box>
                </Box>

                {/* ===== גוף ===== */}
                <Box sx={{ px: 3, pt: 2.5, pb: 1, textAlign: 'center', minHeight: 132 }}>
                  <Typography sx={{ fontSize: 19, fontWeight: 800, color: tipInk, lineHeight: 1.3, mb: 1 }}>
                    {t(tip.titleKey)}
                  </Typography>
                  <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.65 }}>
                    {t(tip.bodyKey)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* נקודות - לחיצות, בצבע הטיפ הפעיל */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.6, pt: 1, pb: 2 }}>
          {FEATURE_TIPS.map((tip, i) => (
            <Box
              key={tip.id}
              role="button"
              tabIndex={0}
              aria-label={t('tipDotAria').replace('{num}', String(i + 1))}
              onClick={() => goTo(i)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(i); } }}
              sx={{
                height: 6, borderRadius: '999px', cursor: 'pointer',
                width: i === activeIndex ? 20 : 6,
                bgcolor: i === activeIndex ? ink : (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'),
                transition: 'width 0.25s ease, background-color 0.25s ease',
              }}
            />
          ))}
        </Box>

        {/* כפתור תחתון - "הבא" מקדם שקופית; בשקופית האחרונה הופך ל"הבנתי" וסוגר */}
        <Box sx={{ px: 3, pb: 3 }}>
          <Box
            role="button"
            tabIndex={0}
            aria-label={isLast ? t('tipGotIt') : t('tipNext')}
            onClick={isLast ? handleClose : () => goTo(activeIndex + 1)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              if (isLast) handleClose(); else goTo(activeIndex + 1);
            }}
            sx={{
              height: 50, borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
              bgcolor: ink, color: isDark ? '#0F172A' : '#fff',
              fontSize: 15, fontWeight: 800, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              boxShadow: `0 8px 20px ${glow}`,
              transition: 'transform 0.08s ease, background-color 0.25s ease, box-shadow 0.25s ease',
              '&:active': { transform: 'scale(0.97)' },
            }}
          >
            {isLast ? t('tipGotIt') : (
              <>
                {t('tipNext')}
                {/* חץ שמאלה - ב-RTL זה כיוון ה"קדימה" (המשך זרימת הקריאה) */}
                <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
              </>
            )}
          </Box>
        </Box>
        </Box>
      </Box>
    </>
  );
};
