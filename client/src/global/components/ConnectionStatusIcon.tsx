import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { WifiFadeIcon } from './icons/WifiFadeIcon';

// פס חיבור גלובלי — נצמד לראש המסך (מעל כל תוכן), מוצג רק כשיש בעיה.
// Portal ל-document.body כדי לעקוף ancestor עם transform שהיה שובר position:fixed.
export const ConnectionStatusIcon = () => {
  const { phase, pendingCount } = useConnectionStatus();
  const [dismissed, setDismissed] = useState(false);

  // כשהמצב חוזר ל-online — מאפסים את הסתרה כך שיוצג שוב בבעיה הבאה
  const prevPhase = phase;
  if (prevPhase === 'online' && dismissed) setDismissed(false);

  const handleDismiss = useCallback(() => setDismissed(true), []);

  if (phase === 'online' || dismissed) return null;

  const isOffline      = phase === 'offline';
  const isTrying       = phase === 'trying';
  const isReconnecting = phase === 'reconnecting';

  const borderColor = (isOffline || isTrying) ? '#fb923c' : '#fbbf24';

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
          ? 'rgba(194, 65, 12, 0.72)'
          : 'rgba(161, 98, 7, 0.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1.5px solid ${borderColor}`,
        pt: 'calc(env(safe-area-inset-top) + 8px)',
        pb: '8px',
        px: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        boxShadow: '0 4px 18px rgba(0,0,0,0.25)',
      }}
    >
      <WifiFadeIcon style={{ fontSize: 22, color: 'white', flexShrink: 0 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: 'white', lineHeight: 1.3 }}>
          {mainText}
        </Typography>
        {subText && (
          <Typography sx={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
            {subText}
          </Typography>
        )}
      </Box>
      {pendingCount > 0 && (
        <Box sx={{
          minWidth: 20, height: 20, px: '4px',
          borderRadius: '999px',
          bgcolor: 'rgba(255,255,255,0.22)',
          color: 'white',
          fontSize: 10.5,
          fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid rgba(255,255,255,0.45)',
          flexShrink: 0,
        }}>
          {pendingCount > 99 ? '99+' : pendingCount}
        </Box>
      )}
      <IconButton
        size="small"
        onClick={handleDismiss}
        aria-label="סגור"
        sx={{
          color: 'rgba(255,255,255,0.8)',
          p: '4px',
          flexShrink: 0,
          '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.12)' },
        }}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>,
    document.body
  );
};
