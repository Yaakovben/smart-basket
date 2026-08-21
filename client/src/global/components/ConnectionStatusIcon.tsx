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

  const barColor = (isOffline || isTrying)
    ? 'linear-gradient(90deg, #9a3412 0%, #c2410c 35%, #ea580c 100%)'
    : 'linear-gradient(90deg, #92400e 0%, #b45309 40%, #d97706 100%)';

  const mainText = isOffline || isTrying
    ? 'אין קליטה'
    : isReconnecting
    ? 'מחפש חיבור...'
    : 'אין חיבור לשרת';

  const subText = pendingCount > 0
    ? `${pendingCount} פעולות ממתינות — יישלחו אוטומטית כשיחזור החיבור`
    : 'הנתונים יישמרו וישלחו כשיחזור החיבור';

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
        background: barColor,
        // מרווח safe-area למכשירי notch
        pt: 'calc(env(safe-area-inset-top) + 14px)',
        pb: '14px',
        px: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
      }}
    >
      <WifiFadeIcon style={{ fontSize: 26, color: 'white', flexShrink: 0 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'white', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
          {mainText}
        </Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
          {subText}
        </Typography>
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
