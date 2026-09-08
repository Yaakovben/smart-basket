import { useEffect, useRef, useState } from 'react';
import { Dialog, Box, Typography, Fade } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useSettings } from '../../global/context/SettingsContext';
import { haptic } from '../../global/helpers';
import { FEATURE_TIPS } from './tips';

interface FeatureTipsPopupProps {
  onClose: () => void;
}

// קרוסלת "ידעת ש...?" - כרטיס מלבני יחיד (לא מסך מלא), במרכז המסך, עם X
// קבוע בפינה השמאלית-העליונה. בפנים - כל הטיפים זמינים לדפדוף (swipe/
// נקודות/כפתור) בישיבה אחת, כדי שמי שסקרן יוכל לעבור על כולם, ומי שלא -
// יכול לסגור בכל רגע. גלילה אופקית native (scroll-snap) + IntersectionObserver
// לזיהוי הטיפ הפעיל - נמנע מחישובי scrollLeft ידניים (בעייתיים ב-RTL בין
// דפדפנים); ניווט תכנותי (נקודות/כפתור) דרך scrollIntoView, שמכבד RTL לבד.
export const FeatureTipsPopup = ({ onClose }: FeatureTipsPopupProps) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

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
        if (bestIndex !== -1 && bestRatio > 0.5) setActiveIndex(bestIndex);
      },
      { root: track, threshold: [0.5, 0.75, 1] }
    );
    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const goTo = (index: number) => {
    haptic('light');
    slideRefs.current[index]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  const handleClose = () => { haptic('light'); onClose(); };
  const isLast = activeIndex === FEATURE_TIPS.length - 1;
  const active = FEATURE_TIPS[activeIndex];

  return (
    <Dialog
      open
      onClose={handleClose}
      fullWidth
      maxWidth={false}
      TransitionComponent={Fade}
      transitionDuration={{ enter: 320, exit: 200 }}
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible',
            m: 2, width: '100%', maxWidth: 380, mx: 'auto',
          },
        },
        backdrop: {
          sx: { bgcolor: 'rgba(3,7,18,0.62)', backdropFilter: 'blur(6px)' },
        },
      }}
    >
      <Box sx={{
        position: 'relative', borderRadius: '26px', overflow: 'hidden',
        bgcolor: isDark ? '#0F172A' : '#FFFFFF',
        boxShadow: `0 26px 70px ${active.glowColor}, 0 2px 10px rgba(0,0,0,0.22)`,
        transition: 'box-shadow 0.35s ease',
        animation: 'tipsIn 0.42s cubic-bezier(0.16, 1, 0.3, 1) both',
        '@keyframes tipsIn': {
          from: { opacity: 0, transform: 'translateY(14px) scale(0.96)' },
          to: { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
      }}>
        {/* X - קבוע בפינה הפיזית השמאלית-עליונה, מעל כל שקופית (זכוכית מט
            כדי שיישאר קריא על כל גרדיאנט hero). left פיזי ולא insetInlineStart -
            המשתמש ביקש "בצד שמאל" במפורש, לא "בצד ההתחלה". */}
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
            bgcolor: 'rgba(255,255,255,0.22)',
            border: '1px solid rgba(255,255,255,0.32)',
            backdropFilter: 'blur(6px)',
            color: '#fff', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            transition: 'background-color 0.15s, transform 0.1s',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.32)' },
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
            bgcolor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.28)',
            backdropFilter: 'blur(6px)',
          }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: 0.3 }}>
              {t('tipEyebrow')}
            </Typography>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.6)' }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums' }}>
              {activeIndex + 1}/{FEATURE_TIPS.length}
            </Typography>
          </Box>
        </Box>

        {/* מסילת גלילה אופקית - כל טיפ תופס את כל רוחב הכרטיס, snap מלא */}
        <Box
          ref={trackRef}
          sx={{
            display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {FEATURE_TIPS.map((tip, i) => (
            <Box
              key={tip.id}
              ref={(el: HTMLDivElement | null) => { slideRefs.current[i] = el; }}
              sx={{ flex: '0 0 100%', minWidth: 0, scrollSnapAlign: 'start' }}
            >
              {/* ===== Hero ===== */}
              <Box sx={{
                position: 'relative', overflow: 'hidden',
                background: tip.gradient,
                px: 3, pt: 6.5, pb: 3.25,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                <Box aria-hidden sx={{
                  position: 'absolute', top: -60, insetInlineEnd: -40, width: 180, height: 180,
                  borderRadius: '50%', background: 'rgba(255,255,255,0.14)', filter: 'blur(6px)',
                }} />
                <Box aria-hidden sx={{
                  position: 'absolute', bottom: -70, insetInlineStart: -50, width: 160, height: 160,
                  borderRadius: '50%', background: 'rgba(0,0,0,0.10)', filter: 'blur(8px)',
                }} />

                <Box sx={{
                  position: 'relative', zIndex: 1,
                  width: 78, height: 78, borderRadius: '22px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 38, lineHeight: 1,
                  bgcolor: 'rgba(255,255,255,0.22)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  backdropFilter: 'blur(6px)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 10px 24px rgba(0,0,0,0.18)',
                }}>
                  {tip.emoji}
                </Box>
              </Box>

              {/* ===== גוף ===== */}
              <Box sx={{ px: 3, pt: 2.5, pb: 1, textAlign: 'center', minHeight: 132 }}>
                <Typography sx={{ fontSize: 19, fontWeight: 800, color: 'text.primary', lineHeight: 1.3, mb: 1 }}>
                  {t(tip.titleKey)}
                </Typography>
                <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.65 }}>
                  {t(tip.bodyKey)}
                </Typography>
              </Box>
            </Box>
          ))}
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
                background: i === activeIndex ? active.gradient : (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'),
                transition: 'width 0.25s ease, background 0.25s ease',
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
              background: active.gradient, color: '#fff',
              fontSize: 15, fontWeight: 800, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              boxShadow: `0 8px 22px ${active.glowColor}`,
              transition: 'transform 0.08s ease, filter 0.12s ease, background 0.25s ease, box-shadow 0.25s ease',
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
    </Dialog>
  );
};
