import { createPortal } from 'react-dom';
import { Box, Typography } from '@mui/material';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { WifiFadeIcon } from './icons/WifiFadeIcon';

// פס חיבור גלובלי — נצמד לראש המסך (מעל כל תוכן), מוצג רק כשיש בעיה.
// Portal ל-document.body כדי לעקוף ancestor עם transform שהיה שובר position:fixed.
export const ConnectionStatusIcon = () => {
  const { phase, pendingCount } = useConnectionStatus();

  if (phase === 'online') return null;

  const isOffline   = phase === 'offline';
  const isTrying    = phase === 'trying';
  const isReconnecting = phase === 'reconnecting';

  const borderColor = (isOffline || isTrying) ? '#ea580c' : '#f59e0b';

  const mainText = isOffline || isTrying
    ? 'אין קליטה'
    : isReconnecting
    ? 'מחפש חיבור...'
    : 'אין חיבור לשרת';

  // תת-כיתוב רק במצב אין קליטה (לא ב-reconnecting שזה רק socket)
  const subText = (isOffline || isTrying)
    ? (pendingCount > 0
        ? `${pendingCount} פעולות ממתינות — יישלחו כשיחזור החיבור`
        : 'הנתונים יישמרו וישלחו כשיחזור החיבור')
    : null;

  return createPortal(
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: (isOffline || isTrying)
          ? 'rgba(154, 52, 18, 0.82)'
          : 'rgba(120, 53, 15, 0.82)',
        backdropFilter: 'blur(12px)',
        borderBottom: `2px solid ${borderColor}`,
        pt: 'calc(env(safe-area-inset-top) + 8px)',
        pb: '8px',
        px: 2.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <WifiFadeIcon style={{ fontSize: 26, color: 'white', flexShrink: 0 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'white', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
          {mainText}
        </Typography>
        {subText && (
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
            {subText}
          </Typography>
        )}
      </Box>
      {pendingCount > 0 && (
        <Box sx={{
          mr: 'auto',
          ml: 0,
          minWidth: 22,
          height: 22,
          px: '5px',
          borderRadius: '999px',
          bgcolor: 'rgba(255,255,255,0.25)',
          color: 'white',
          fontSize: 11,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid rgba(255,255,255,0.5)',
        }}>
          {pendingCount > 99 ? '99+' : pendingCount}
        </Box>
      )}
    </Box>,
    document.body
  );
};
