import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { haptic } from '../../../global/helpers';

// כפתור צף לעוזר ה-AI - פינה שמאלית תחתונה (פיזית, לא RTL-relative), מעל
// בר הניווט התחתון. Portal ל-document.body כמו HomeBottomNav, כדי לעקוף
// ancestor עם transform/filter שהיה הופך position:fixed ליחסי לאב.
export const AiAssistantFab = () => {
  const navigate = useNavigate();

  return createPortal(
    <Box
      aria-label="עוזר קניות חכם"
      role="button"
      tabIndex={0}
      onClick={(e) => {
        (e.currentTarget as HTMLElement).blur();
        haptic('light');
        navigate('/assistant');
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          haptic('light');
          navigate('/assistant');
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
        background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
        boxShadow: '0 8px 22px rgba(99,102,241,0.45), 0 3px 8px rgba(0,0,0,0.18)',
        transition: 'box-shadow 0.18s, transform 0.12s',
        '&:active': { transform: 'scale(0.92)' },
        '@media (max-width: 360px)': { width: 44, height: 44 },
      }}
    >
      <AutoAwesomeIcon sx={{ fontSize: 22, color: 'white', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
    </Box>,
    document.body
  );
};
