import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { AiAssistantIcon } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { useConnectionStatus } from '../../../global/hooks';
import { haptic, safeStorage } from '../../../global/helpers';

const HINT_SHOW_DELAY_MS = 700;
const HINT_AUTOHIDE_MS = 7000;
const OFFLINE_HINT_MS = 3000;
const NEW_BADGE_KEY = 'sb_ai_fab_used';

// כפתור צף לעוזר ה-AI - פינה שמאלית תחתונה (פיזית, לא RTL-relative), מעל
// בר הניווט התחתון. Portal ל-document.body כמו HomeBottomNav, כדי לעקוף
// ancestor עם transform/filter שהיה הופך position:fixed ליחסי לאב.
export const AiAssistantFab = () => {
  const navigate = useNavigate();
  const { settings, t } = useSettings();
  const isDark = settings.theme === 'dark';
  const { phase } = useConnectionStatus();
  const [showHint, setShowHint] = useState(false);
  const [showOfflineHint, setShowOfflineHint] = useState(false);
  // תג "חדש" - נשאר עד שהמשתמש בפועל פותח את העוזר בפעם הראשונה, לא רק
  // עד שרואה את הרמז הטקסטואלי (שנעלם אחרי 7ש' ועלול לפספס משתמש שלא שם לב).
  const [showNewBadge, setShowNewBadge] = useState(() => safeStorage.get(NEW_BADGE_KEY) !== 'true');

  // רמז טקסט "שאל את ה-AI" - מוצג בכל פתיחת דף הבית, נעלם אחרי 7 שניות.
  useEffect(() => {
    const showTimer = window.setTimeout(() => setShowHint(true), HINT_SHOW_DELAY_MS);
    const hideTimer = window.setTimeout(() => setShowHint(false), HINT_SHOW_DELAY_MS + HINT_AUTOHIDE_MS);
    return () => { window.clearTimeout(showTimer); window.clearTimeout(hideTimer); };
  }, []);

  const handleOpen = () => {
    // בלי אינטרנט, ניווט לעמוד ה-AI פשוט "תקוע" בלי שום משוב - עמוד הצ'אט
    // נטען lazy (code-splitting) וה-SW הזה בכוונה לא עושה שום caching (ראו
    // sw.ts), אז ה-chunk שלו חייב רשת בכל טעינה. עדיף להראות הודעה ברורה
    // כאן, במקום לנווט לעמוד שכנראה לא יעלה בכלל.
    if (phase !== 'online') {
      haptic('light');
      setShowOfflineHint(true);
      window.setTimeout(() => setShowOfflineHint(false), OFFLINE_HINT_MS);
      return;
    }
    setShowHint(false);
    if (showNewBadge) {
      setShowNewBadge(false);
      safeStorage.set(NEW_BADGE_KEY, 'true');
    }
    haptic('light');
    navigate('/assistant');
  };

  return createPortal(
    <>
      {showOfflineHint && (
        <Box
          role="status"
          aria-live="polite"
          sx={{
            position: 'fixed',
            bottom: 'max(96px, calc(env(safe-area-inset-bottom) + 86px))',
            left: 16,
            insetInlineEnd: 16,
            zIndex: 1089,
            bgcolor: isDark ? '#1E293B' : '#ffffff',
            color: 'text.primary',
            px: 1.75, py: 1,
            borderRadius: '14px',
            fontSize: 12.5, fontWeight: 700,
            textAlign: 'center',
            boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
            border: '1px solid', borderColor: isDark ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.2)',
            animation: 'aiOfflineHintPop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            '@keyframes aiOfflineHintPop': {
              from: { opacity: 0, transform: 'translateY(6px) scale(0.95)' },
              to: { opacity: 1, transform: 'none' },
            },
          }}
        >
          {t('aiOfflineHint')}
        </Box>
      )}
      {showHint && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 'max(96px, calc(env(safe-area-inset-bottom) + 86px))',
            left: 70,
            zIndex: 1089,
            bgcolor: isDark ? '#1E293B' : '#ffffff',
            color: 'text.primary',
            px: 1.75, py: 1,
            borderRadius: '14px',
            fontSize: 13, fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
            border: '1px solid', borderColor: isDark ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.2)',
            animation: 'aiHintPop 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            '@keyframes aiHintPop': {
              from: { opacity: 0, transform: 'translateX(8px) scale(0.9)' },
              to: { opacity: 1, transform: 'translateX(0) scale(1)' },
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              left: -6, top: '50%', transform: 'translateY(-50%)',
              width: 0, height: 0,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderRight: `6px solid ${isDark ? '#1E293B' : '#ffffff'}`,
            },
          }}
        >
          {t('aiAssistantHint')}
        </Box>
      )}
      <Box
        aria-label={t('aiAssistantTitle')}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          (e.currentTarget as HTMLElement).blur();
          handleOpen();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
        sx={{
          position: 'fixed',
          // מעל בר הניווט התחתון (60px) + מרווח נוח מה-FAB המרכזי.
          bottom: 'max(88px, calc(env(safe-area-inset-bottom) + 78px))',
          left: 16,
          zIndex: 1090,
          width: 48, height: 48, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          outline: 'none',
          background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
          boxShadow: '0 8px 22px rgba(139,92,246,0.3), 0 4px 14px rgba(20,184,166,0.3), 0 3px 8px rgba(0,0,0,0.18)',
          transition: 'box-shadow 0.18s, transform 0.12s',
          '&:active': { transform: 'scale(0.92)' },
          '@media (max-width: 360px)': { width: 44, height: 44 },
        }}
      >
        <AiAssistantIcon sx={{ fontSize: 22, color: 'white', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
        {showNewBadge && (
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute', top: -8, insetInlineEnd: -10,
              px: 0.6, py: 0.15, borderRadius: '999px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
              border: '1.5px solid', borderColor: isDark ? '#0F172A' : '#F8FAFB',
              color: 'white', fontSize: 8.5, fontWeight: 800, lineHeight: 1.4,
              whiteSpace: 'nowrap',
              boxShadow: '0 0 0 0 rgba(139,92,246,0.6)',
              animation: 'aiNewBadgePulse 1.8s ease-out infinite',
              '@keyframes aiNewBadgePulse': {
                '0%': { boxShadow: '0 0 0 0 rgba(139,92,246,0.6)' },
                '70%': { boxShadow: '0 0 0 6px rgba(139,92,246,0)' },
                '100%': { boxShadow: '0 0 0 0 rgba(139,92,246,0)' },
              },
            }}
          >
            חדש
          </Box>
        )}
      </Box>
    </>,
    document.body
  );
};
