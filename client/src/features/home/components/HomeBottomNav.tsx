import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AddIcon from '@mui/icons-material/Add';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { haptic } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';

interface HomeBottomNavProps {
  contentRef: RefObject<HTMLDivElement | null>;
  onOpenMenu: () => void;
  t: (key: TranslationKeys) => string;
}

// בר ניווט תחתון + FAB, מרונדרים דרך portal ישירות ל-document.body כדי
// לעקוף כל ancestor עם transform/filter/will-change/contain שהיה הופך
// את ה-position:fixed שלהם ליחסי לאב במקום לויאופורט.
export const HomeBottomNav = ({ contentRef, onOpenMenu, t }: HomeBottomNavProps) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';

  return createPortal(
    <>
      {/* Bar */}
      <Box
        sx={{
          // fixed - נעול לויאופורט. הבר נמצא מחוץ ל-root Box כך שאין ancestor
          // עם transform/filter שיהפוך אותו לפעול כ-absolute.
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 1000,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          // ללא padding-bottom של safe-area - הבר צמוד לחלוטין לתחתית
          // הפיזית של המסך גם ב-iPhone PWA. ה-home indicator עלול לחפוף.
          pb: 0,
          boxShadow: isDark
            ? '0 -8px 24px rgba(0,0,0,0.4), 0 -2px 6px rgba(0,0,0,0.25)'
            : '0 -8px 24px rgba(0,0,0,0.08), 0 -2px 6px rgba(0,0,0,0.04)',
          // חתך עגול רך/חלק במרכז העליון של הבר - גרדיאנט הדרגתי במקום
          // קצה חד של 1px. רדיוס 50, מעבר רך מ-38 (שקוף) ל-50 (אטום) =
          // 12px gradient transition. נותן חתך שמתערבב חלק עם הבר במקום
          // קצה שטוח. ה-FAB (28px רדיוס) יושב חצי בתוך החתך.
          // חתך חד עם מעבר 1px - מסתנכרן עם ה-border-arc סביב ה-FAB ליצירת קו רציף
          WebkitMaskImage: 'radial-gradient(circle 38px at 50% 0%, transparent 37px, black 38px)',
          maskImage: 'radial-gradient(circle 38px at 50% 0%, transparent 37px, black 38px)',
          overscrollBehavior: 'contain',
          touchAction: 'manipulation',
          // נעילה ל-layout viewport - מפצה על תזוזת visualViewport ב-iOS rubber-band
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: { xs: '100%', sm: 500, md: 600 },
            mx: 'auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: { xs: 1, sm: 1.5 },
            py: { xs: 0.6, sm: 0.85 },
            px: { xs: 2.5, sm: 3.5 },
            minHeight: 50,
            '@media (max-width: 360px)': { py: 0.5, px: 2, minHeight: 46 },
            '@media (max-width: 320px)': { py: 0.4, px: 1.5, minHeight: 42 },
          }}
        >
          {/* ימין (RTL = ראשון ב-DOM) - בית. onPointerUp במקום onClick + blur אחרי
              לחיצה כדי שלא ישאר focus שתוקע את ה-UX עד טאפ נוסף. touch-action
              manipulation מבטל delay של 300ms וכפתור-כפול ב-iOS. role+tabIndex+
              onKeyDown - בלעדיהם האלמנט לא נגיש בכלל למקלדת/screen reader
              (onPointerUp לא יורה על Enter/Space). */}
          <Box
            onPointerUp={(e) => {
              (e.currentTarget as HTMLElement).blur();
              contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={t('home')}
            sx={{
              position: 'relative',
              flex: 1, maxWidth: 110,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 0.3,
              minHeight: 40,
              py: 0.35,
              cursor: 'pointer', userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              outline: 'none',
              // ללא bgcolor/borderRadius - רק האייקון והטקסט בצבע טורקיז מסמנים
              // שזה הטאב הפעיל. נקי, מינימליסטי, בלי "כפתור" ויזואלי.
              transition: 'opacity 0.12s ease',
              '&:active': { opacity: 0.6 },
            }}
          >
            <HomeIcon sx={{ fontSize: 24, color: '#0D9488' }} />
            {/* פס מוארך מתחת לאייקון מסמן "פעיל" - אלגנטי ובולט יותר מנקודה */}
            <Box sx={{
              width: 18, height: 3, borderRadius: '2px',
              backgroundImage: 'linear-gradient(90deg, #14B8A6, #0D9488)',
              boxShadow: '0 1px 3px rgba(20,184,166,0.4)',
              mt: 0.1,
              animation: 'tabIndicatorIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              '@keyframes tabIndicatorIn': {
                from: { width: 0, opacity: 0 },
                to: { width: 18, opacity: 1 },
              },
            }} />
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#0D9488', letterSpacing: 0.2, lineHeight: 1, mt: 0.15 }}>
              {t('home')}
            </Typography>
          </Box>

          {/* ה-FAB מורם החוצה כאחיו של הפס - ראה למעלה. כאן רק spacer לשמור
              על מקום במרכז כדי שהטאבים יישארו על הצדדים ולא יתקרבו למרכז */}
          <Box sx={{ width: 64, flexShrink: 0, '@media (max-width: 360px)': { width: 58 }, '@media (max-width: 320px)': { width: 52 } }} />

          {/* שמאל (RTL = אחרון ב-DOM) - תובנות. ניווט מתבצע ב-onPointerDown
              (מיידי - לא מחכה ל-up) לתגובה מהירה כמו אפליקציות נייטיב. ה-:active
              צובע ברקע טורקיז עם האייקון והטקסט בולטים - פידבק ויזואלי ברור.
              role+tabIndex+onKeyDown - נגישות מקלדת (ראו הערה בטאב "בית" למעלה). */}
          <Box
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).blur();
              haptic('light');
              navigate('/insights');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                haptic('light');
                navigate('/insights');
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={t('insights')}
            sx={{
              flex: 1, maxWidth: 110,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 0.3,
              minHeight: 40,
              py: 0.35,
              cursor: 'pointer', userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              outline: 'none',
              // ללא bgcolor - מינימליסטי כמו הטאב הפעיל
              transition: 'opacity 0.12s ease',
              '&:active': { opacity: 0.6 },
            }}
          >
            <InsightsOutlinedIcon sx={{ fontSize: 24, color: 'text.primary', opacity: 0.55 }} />
            {/* spacer בגובה הפס של הטאב הפעיל - שומר על אותה היררכיה */}
            <Box sx={{ width: 18, height: 3, mt: 0.1 }} />
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.primary', opacity: 0.65, letterSpacing: 0.2, lineHeight: 1, mt: 0.15 }}>
              {t('insights')}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* קשת ה-border מתחת ל-FAB הוסרה לפי בקשת בעל המוצר - מראה נקי יותר. */}

      {/* FAB - באותו portal */}
      <Box
        sx={{
          // bottom של ה-FAB מחושב כך שמרכז העיגול יושב בדיוק על שפת הבר העליונה.
          // בר=60px, FAB radius=28px → bottom = 60-28 = 32px → מרכז ב-y=60 = שפת הבר.
          // זה נותן חצי-FAB מעל הבר, חצי בתוך החתך - אסתטיקה סטנדרטית.
          // max עם safe-area-inset-bottom: על iPhone עם home indicator (~34px), ה-max
          // יבטיח שה-FAB יהיה מעל ה-indicator ולא יחפוף.
          // על Android safe-area=0 → max(32, 0) = 32 → FAB מתואם בדיוק לבר.
          position: 'fixed',
          bottom: 'max(32px, env(safe-area-inset-bottom))',
          left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
          zIndex: 1100,
          pointerEvents: 'none',
          '& > *': { pointerEvents: 'auto' },
        }}
      >
        <Box
          aria-label={t('new')}
          role="button"
          tabIndex={0}
          // onClick (לא onPointerUp) - מונע ghost-click על Android שגרם
          // לפלוס לפתוח את התפריט וה-click המעוכב לסגור אותו מיד.
          onClick={(e) => {
            (e.currentTarget as HTMLElement).blur();
            haptic('medium');
            onOpenMenu();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              haptic('medium');
              onOpenMenu();
            }
          }}
          sx={{
            width: 56, height: 56, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            outline: 'none',
            background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 50%, #0D9488 100%)',
            border: 'none',
            // אנימציית pulse עדינה כשבמנוחה - מושכת את העין בלי להציק
            animation: 'fabIdlePulse 2.6s ease-in-out infinite',
            '@keyframes fabIdlePulse': {
              '0%, 100%': { transform: 'scale(1)', boxShadow: '0 10px 28px rgba(20,184,166,0.5), 0 4px 10px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3)' },
              '50%': { transform: 'scale(1.04)', boxShadow: '0 14px 36px rgba(20,184,166,0.65), 0 5px 12px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.35)' },
            },
            boxShadow: [
              '0 10px 28px rgba(20,184,166,0.5)',
              '0 4px 10px rgba(0,0,0,0.18)',
              'inset 0 1px 0 rgba(255,255,255,0.3)',
            ].join(', '),
            transition: 'box-shadow 0.18s, transform 0.12s',
            '&:active': { transform: 'scale(0.96)' },
            '@media (max-width: 360px)': { width: 52, height: 52 },
            '@media (max-width: 320px)': { width: 48, height: 48 },
          }}
        >
          <AddIcon sx={{
            fontSize: 30, color: 'white',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
            '@media (max-width: 360px)': { fontSize: 28 },
          }} />
        </Box>
      </Box>
    </>,
    document.body
  );
};
