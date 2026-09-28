import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import { useSettings } from '../../../global/context/SettingsContext';
import { COMMON_STYLES } from '../../../global/constants';
import { haptic } from '../../../global/helpers';
import { useUserLocation } from '../hooks/useUserLocation';
import { useLiveLocation } from '../hooks/useLiveLocation';
import { usePriceScan } from '../hooks/usePriceScan';
import { NavigationPicker } from '../components/NavigationPicker';
import { ScanIdleView } from '../components/scan/ScanIdleView';
import { ScanResultView } from '../components/scan/ScanResultView';
import { ScanResultSkeleton } from '../components/scan/ScanResultSkeleton';
import { scanCardSx, SCAN_TEAL } from '../components/scan/scanStyles';
import type { NearestBranch, ScanNearbyBranch, ScanHere } from '../types/priceComparison.types';
import { getPriceScanStrings } from '../priceScan.strings';

// טעינה עצלה: @zxing נטען רק כשפותחים את הסורק (ונטען מראש מכפתור הכניסה)
const QRScanner = lazy(() => import('../../../global/components/QRScanner').then(m => ({ default: m.QRScanner })));

const toNavBranch = (b: ScanNearbyBranch | ScanHere): NearestBranch => ({
  storeId: b.storeId, branchName: `${b.chainName} ${b.branchName}`.trim(), city: b.city, address: b.address,
  lat: b.lat, lng: b.lng, distanceKm: b.distanceKm,
});

// סורקים מוצר ומקבלים איפה הוא הכי זול: קרוב אליי, ובכל הארץ.
export const PriceScanPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const s = getPriceScanStrings(settings.language);
  const { location: storedLocation, status: locationStatus, requestLocation, resetDenied } = useUserLocation();
  // מיקום GPS חי ומדויק כל עוד העמוד פתוח, כדי לזהות את הסופר שהמשתמש עומד בו
  const location = useLiveLocation(storedLocation, locationStatus === 'granted');
  const { barcode, phase, result, slow, timedOut, refreshing, recent, check, cancel, clearRecent } = usePriceScan(location);

  const [scannerOpen, setScannerOpen] = useState(true);
  const [navBranch, setNavBranch] = useState<NearestBranch | null>(null);

  const enableLocation = () => {
    haptic('light');
    if (locationStatus === 'denied') resetDenied();
    requestLocation();
  };

  // הרטט על זיהוי הברקוד כבר קורה בסורק עצמו, ברגע הזיהוי
  const handleScan = (code: string) => {
    setScannerOpen(false);
    void check(code);
  };

  const cancelCheck = () => { haptic('medium'); cancel(); };

  const scanAgain = () => { haptic('light'); setScannerOpen(true); };

  const showIdle = phase === 'idle' || phase === 'notFound' || phase === 'error';

  return (
    <Box sx={{
      height: { xs: 'var(--app-height, 100dvh)', sm: '100vh' }, display: 'flex', flexDirection: 'column',
      bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', overflow: 'hidden',
    }}>
      <Box sx={{
        background: COMMON_STYLES.gradients.header,
        p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 20px', sm: '48px 20px 20px' },
        flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate(-1)} sx={COMMON_STYLES.glassIconButton} aria-label={s.back}>
            <ArrowForwardIcon sx={{ fontSize: 22 }} />
          </IconButton>
          <Typography sx={{ flex: 1, color: 'white', fontSize: 20, fontWeight: 700 }}>{s.title}</Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', p: 2, pb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {phase === 'loading' && <ScanResultSkeleton s={s} slow={slow} onCancel={cancelCheck} />}

          {phase === 'notFound' && (
            <Box sx={{ ...scanCardSx(isDark), textAlign: 'center', py: 2.5 } as object}>
              <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 0.5 }}>{s.notFoundTitle}</Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{s.notFoundBody}</Typography>
            </Box>
          )}

          {phase === 'error' && (
            <Box sx={{ ...scanCardSx(isDark), textAlign: 'center', py: 2.5 } as object}>
              <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 1 }}>{timedOut ? s.timeout : s.error}</Typography>
              {barcode && (
                <Button onClick={() => void check(barcode)} sx={{ textTransform: 'none', fontWeight: 700, color: SCAN_TEAL }}>{s.retry}</Button>
              )}
            </Box>
          )}

          {phase === 'result' && result && (
            <ScanResultView
              key={result.barcode}
              s={s} lang={settings.language} isDark={isDark} result={result}
              hasLocation={!!location} locating={!!location && !location.live} refreshing={refreshing}
              locationStatus={locationStatus}
              onEnableLocation={enableLocation}
              onNavigate={(b) => setNavBranch(toNavBranch(b))}
            />
          )}

          <ScanIdleView
            s={s} isDark={isDark} showIntro={showIdle}
            hasLocation={!!location} locationStatus={locationStatus}
            onEnableLocation={enableLocation}
            onSubmitBarcode={(code) => { haptic('medium'); void check(code); }}
            recent={recent.filter((r) => phase !== 'result' || r.barcode !== result?.barcode)}
            onClearRecent={clearRecent}
          />
        </Box>
      </Box>

      {/* כפתור הסריקה קבוע בתחתית, זמין תמיד בלי לגלול */}
      <Box sx={{
        flexShrink: 0, px: 2, pt: 1.25, pb: 'calc(12px + env(safe-area-inset-bottom))',
        borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default',
      }}>
        <Button
          variant="contained" fullWidth startIcon={<QrCodeScannerRoundedIcon />} onClick={scanAgain}
          sx={{ borderRadius: '14px', py: 1.3, fontWeight: 800, textTransform: 'none', fontSize: 15 }}
        >
          {phase === 'result' || phase === 'notFound' ? s.scanAnother : s.scan}
        </Button>
      </Box>

      <Suspense fallback={null}>
        {scannerOpen && (
          <QRScanner open={scannerOpen} mode="barcode" onClose={() => setScannerOpen(false)} onScan={handleScan} />
        )}
      </Suspense>
      <NavigationPicker branch={navBranch} isDark={isDark} onClose={() => setNavBranch(null)} />
    </Box>
  );
};
