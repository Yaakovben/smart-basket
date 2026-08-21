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

  // צבע: offline/trying = כתום-אדמדם יותר, reconnecting = כתום בהיר יותר
  const barColor = (isOffline || isTrying)
    ? 'linear-gradient(90deg, #ea580c 0%, #f97316 60%, #fb923c 100%)'
    : 'linear-gradient(90deg, #f97316 0%, #fb923c 60%, #fdba74 100%)';

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
        pt: 'env(safe-area-inset-top)',
        px: 2,
        py: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      }}
    >
      <WifiFadeIcon style={{ fontSize: 18, color: 'white', flexShrink: 0, opacity: 0.95 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'white', lineHeight: 1.3 }}>
          {mainText}
        </Typography>
        <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.88)', lineHeight: 1.3 }}>
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
