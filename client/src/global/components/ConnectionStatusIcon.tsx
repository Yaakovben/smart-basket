import { useState, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useSettings } from '../context/SettingsContext';
import { haptic } from '../helpers';
import { WifiFadeIcon } from './icons/WifiFadeIcon';

const TAP_LABEL_MS = 3000;

// אייקון חיבור inline - יושב בתוך אשכול האייקונים של הכותרת (ליד הפעמון
// בעמוד הבית, ובאותו סלוט בדיוק בכותרות אחרות) במקום לצוף כ-overlay נפרד.
// מוצג רק כשיש בעיה (online = null, לא מרנדר כלום - לא תופס מקום בכותרת).
// בלי רקע/גלולה - רק האייקון בצבע שמתאר את המצב, תואם לשפה הוויזואלית
// של שאר אייקוני הכותרת (לבנים על גרדיאנט, בלי בועה סביבם).
export const ConnectionStatusIcon = () => {
  const { t } = useSettings();
  const { phase, pendingCount } = useConnectionStatus();
  const [showLabel, setShowLabel] = useState(false);
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (phase === 'online') return null;

  const isOffline = phase === 'offline';
  const isReconnecting = phase === 'reconnecting';
  const label = isOffline
    ? (pendingCount > 0 ? `${t('offlineMessage')} · ${t('offlinePendingSync')}` : t('offlineMessage'))
    : isReconnecting ? t('reconnectingMessage') : t('serverUnreachableMessage');
  const color = isOffline ? '#FCA5A5' : isReconnecting ? '#FCD34D' : 'white';

  const handleTap = () => {
    haptic('light');
    setShowLabel(true);
    if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    labelTimerRef.current = setTimeout(() => setShowLabel(false), TAP_LABEL_MS);
  };

  return (
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Box
        component="button"
        type="button"
        onClick={handleTap}
        aria-label={label}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, flexShrink: 0,
          bgcolor: 'transparent', border: 'none', cursor: 'pointer', p: 0,
          WebkitTapHighlightColor: 'transparent',
          '@media (max-width: 360px)': { width: 30, height: 30 },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <WifiFadeIcon style={{ fontSize: 21, color, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }} />
          {isOffline && pendingCount > 0 && (
            <Box sx={{
              position: 'absolute', top: -5, insetInlineEnd: -7,
              minWidth: 13, height: 13, px: '3px',
              borderRadius: '999px',
              bgcolor: '#EF4444', color: 'white',
              fontSize: 8.5, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}>
              {pendingCount > 99 ? '99+' : pendingCount}
            </Box>
          )}
        </Box>
      </Box>

      {showLabel && (
        <Box sx={{
          position: 'absolute', top: '100%', insetInlineEnd: 0, mt: 0.5,
          bgcolor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          borderRadius: '10px', px: 1.25, py: 0.6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          zIndex: 10, whiteSpace: 'nowrap',
        }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'white' }}>
            {label}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
