import { useEffect, useState } from 'react';
import { Box, Button, Typography, LinearProgress } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import { ShimmerBlock } from '../../../../global/components';
import type { PriceScanStrings } from '../../priceScan.strings';
import { SCAN_TEAL, scanCardSx } from './scanStyles';

// כל כמה זמן מתחלף תיאור מה נבדק עכשיו (כל הבדיקות רצות במקביל בשרת)
const STEP_MS = 1400;

// המתנה לתוצאה: הברקוד שנבדק, מה נבדק עכשיו, וביטול בולט וזמין תמיד.
// מתחת, שלד בצורת התוצאה עצמה, כדי שהמעבר לא יקפיץ את המסך.
export const ScanResultSkeleton = ({ s, isDark, barcode, slow, onCancel }: {
  s: PriceScanStrings;
  isDark: boolean;
  barcode: string | null;
  slow: boolean;
  onCancel: () => void;
}) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStep((v) => Math.min(v + 1, s.loadingSteps.length - 1)), STEP_MS);
    return () => window.clearInterval(timer);
  }, [s.loadingSteps.length]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }} aria-busy="true" aria-live="polite">
      <Box sx={{ ...scanCardSx(isDark), position: 'relative', overflow: 'hidden', pb: 2.25 } as object}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '14px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: isDark ? 'rgba(20,184,166,0.16)' : 'rgba(20,184,166,0.1)', color: SCAN_TEAL,
            animation: 'scanPulse 1.4s ease-in-out infinite',
            '@keyframes scanPulse': { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.08)' } },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}>
            <QrCodeScannerRoundedIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 900 }}>
              {slow ? s.loadingSlowTitle : s.loadingSteps[step]}
            </Typography>
            {slow ? (
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>{s.loadingSlow}</Typography>
            ) : barcode && (
              <Typography dir="ltr" sx={{ fontSize: 12, color: 'text.disabled', mt: 0.25, textAlign: 'start' }}>{barcode}</Typography>
            )}
          </Box>
        </Box>
        <Button
          variant={slow ? 'contained' : 'outlined'} fullWidth onClick={onCancel}
          sx={{
            mt: 1.75, borderRadius: '12px', py: 1, gap: 1, textTransform: 'none', fontWeight: 800, fontSize: 14.5,
            ...(slow
              ? { bgcolor: 'error.main', color: '#fff', '&:hover': { bgcolor: 'error.dark' } }
              : { color: 'text.secondary', borderColor: 'divider' }),
          }}
        >
          {/* רווח קבוע בין האייקון לטקסט (startIcon נצמד לטקסט בעברית) */}
          <CloseRoundedIcon sx={{ fontSize: 20 }} />
          {s.cancel}
        </Button>
        <LinearProgress sx={{
          position: 'absolute', insetInline: 0, bottom: 0, height: 3, bgcolor: 'transparent',
          '& .MuiLinearProgress-bar': { bgcolor: SCAN_TEAL },
        }} />
      </Box>
      <ShimmerBlock height={132} radius={20} />
      <ShimmerBlock height={200} radius={18} />
    </Box>
  );
};
