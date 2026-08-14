import { useState, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useSettings } from '../context/SettingsContext';
import { haptic } from '../helpers';
import { WifiFadeIcon } from './icons/WifiFadeIcon';

const TAP_LABEL_MS = 3000;

// באנר אדום מלא-רוחב - רק לשלב "offline" המאושר (אין אינטרנט למכשיר,
// אחרי grace period). שלבי "trying"/"reconnecting" הפחות דחופים מוצגים
// כאייקון עדין בתוך כותרות העמודים עצמן (ConnectionStatusIcon, ליד
// הפעמון/אשכול האייקונים), לא כ-overlay נפרד - ראו useConnectionStatus.
export const OfflineBanner = () => {
  const { t } = useSettings();
  const { phase, pendingCount } = useConnectionStatus();
  const [showLabel, setShowLabel] = useState(false);
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (phase !== 'offline') return null;

  const handleTap = () => {
    haptic('light');
    setShowLabel(true);
    if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    labelTimerRef.current = setTimeout(() => setShowLabel(false), TAP_LABEL_MS);
  };

  return (
    <Box
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTap(); } }}
      sx={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 9999,
        bgcolor: '#EF4444',
        pt: 'max(env(safe-area-inset-top), 6px)',
        pb: '6px', px: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        animation: 'sbSlideDown 0.35s ease',
        WebkitTapHighlightColor: 'transparent',
        '@keyframes sbSlideDown': { from: { transform: 'translateY(-100%)' }, to: { transform: 'none' } },
      }}
    >
      <Box sx={{ position: 'relative', display: 'flex' }}>
        <WifiFadeIcon style={{ fontSize: 20, flexShrink: 0, color: 'white' }} />
        {pendingCount > 0 && (
          <Box sx={{
            position: 'absolute', top: -6, insetInlineEnd: -8,
            minWidth: 14, height: 14, px: '3px',
            borderRadius: '999px',
            bgcolor: 'white', color: '#EF4444',
            fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {pendingCount > 99 ? '99+' : pendingCount}
          </Box>
        )}
      </Box>
      {showLabel && (
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>
          {pendingCount > 0 ? `${t('offlineMessage')} · ${t('offlinePendingSync')}` : t('offlineMessage')}
        </Typography>
      )}
    </Box>
  );
};
