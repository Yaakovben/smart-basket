import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Button, ButtonBase } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import NavigationRoundedIcon from '@mui/icons-material/NavigationRounded';
import { useSettings } from '../../../global/context/SettingsContext';
import { COMMON_STYLES } from '../../../global/constants';
import { ShimmerList } from '../../../global/components';
import { formatILS, haptic } from '../../../global/helpers';
import { emitPlanLimit } from '../../../global/helpers/planLimitEvent';
import { priceComparisonApi } from '../services/priceComparison.api';
import { useUserLocation } from '../hooks/useUserLocation';
import { NavigationPicker } from '../components/NavigationPicker';
import type { BarcodeScanResult, NearestBranch, ScanNearbyBranch } from '../types/priceComparison.types';
import { getPriceScanStrings } from '../priceScan.strings';

// טעינה עצלה: @zxing נטען רק כשפותחים את הסורק
const QRScanner = lazy(() => import('../../../global/components/QRScanner').then(m => ({ default: m.QRScanner })));

const TEAL = '#0D9488';
const NEARBY_PREVIEW = 3;

type Phase = 'idle' | 'loading' | 'result' | 'notFound' | 'error';

// סורקים מוצר ומקבלים איפה הוא הכי זול: קרוב אליי, ובכל הארץ.
export const PriceScanPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const s = getPriceScanStrings(settings.language);
  const { location, status: locationStatus, requestLocation, resetDenied } = useUserLocation();

  const [scannerOpen, setScannerOpen] = useState(true);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<BarcodeScanResult | null>(null);
  const [showAllNearby, setShowAllNearby] = useState(false);
  const [navBranch, setNavBranch] = useState<NearestBranch | null>(null);
  const requestIdRef = useRef(0);
  // האם הבדיקה האחרונה נשלחה עם מיקום
  const fetchedWithLocationRef = useRef(false);

  const fetchPrices = useCallback(async (code: string) => {
    const id = ++requestIdRef.current;
    fetchedWithLocationRef.current = !!location;
    setPhase('loading');
    setShowAllNearby(false);
    try {
      const data = await priceComparisonApi.scanProduct(code, location);
      if (id !== requestIdRef.current) return;
      setResult(data);
      setPhase(data ? 'result' : 'notFound');
    } catch (err) {
      if (id !== requestIdRef.current) return;
      if ((err as { response?: { status?: number } })?.response?.status === 402) {
        emitPlanLimit('priceComparison');
        setPhase('idle');
        return;
      }
      setPhase('error');
    }
  }, [location]);

  // המיקום הגיע אחרי שכבר נבדק מחיר בלעדיו: בודקים שוב, עכשיו עם "קרוב אליך".
  useEffect(() => {
    if (!location || !barcode || fetchedWithLocationRef.current) return;
    const timer = window.setTimeout(() => { void fetchPrices(barcode); }, 0);
    return () => window.clearTimeout(timer);
  }, [location, barcode, fetchPrices]);

  const handleScan = (code: string) => {
    haptic('medium');
    setScannerOpen(false);
    setBarcode(code);
    void fetchPrices(code);
  };

  const scanAgain = () => { haptic('light'); setScannerOpen(true); };

  const toNavBranch = (b: ScanNearbyBranch): NearestBranch => ({
    storeId: b.storeId, branchName: `${b.chainName} ${b.branchName}`.trim(), city: b.city, address: b.address,
    lat: b.lat, lng: b.lng, distanceKm: b.distanceKm,
  });

  const cardSx = {
    bgcolor: 'background.paper', borderRadius: '18px', p: 2,
    border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)',
  } as const;
  const labelSx = { fontSize: 12, fontWeight: 800, color: 'text.secondary', mb: 1.25, letterSpacing: 0.2 } as const;

  const nearbyRow = (b: ScanNearbyBranch, i: number) => (
    <ButtonBase
      key={`${b.chainId}:${b.storeId}`}
      onClick={() => { haptic('light'); setNavBranch(toNavBranch(b)); }}
      sx={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 1.25, p: 1.25, borderRadius: '14px', textAlign: 'start',
        bgcolor: i === 0 ? (isDark ? 'rgba(20,184,166,0.14)' : 'rgba(20,184,166,0.08)') : 'transparent',
        border: '1px solid', borderColor: i === 0 ? 'rgba(20,184,166,0.35)' : 'transparent',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {b.chainName}
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[b.branchName, b.city].filter(Boolean).join(', ')} · {s.km(b.distanceKm)}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
        <Typography sx={{ fontSize: 17, fontWeight: 900, color: i === 0 ? TEAL : 'text.primary' }}>{formatILS(b.price, 2)}</Typography>
        {!b.verified && <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{s.chainPrice}</Typography>}
      </Box>
      <NavigationRoundedIcon sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }} />
    </ButtonBase>
  );

  const nearbySection = () => {
    if (!result) return null;
    if (!location) {
      const blocked = locationStatus === 'denied' || locationStatus === 'blocked';
      return (
        <Box sx={cardSx}>
          <Typography sx={labelSx}>{s.nearbyTitle}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.25 }}>
            {blocked ? s.locationBlocked : s.locationPrompt}
          </Typography>
          {locationStatus !== 'blocked' ? (
            <Button
              variant="outlined" fullWidth startIcon={<MyLocationRoundedIcon />}
              disabled={locationStatus === 'requesting'}
              onClick={() => { if (locationStatus === 'denied') resetDenied(); requestLocation(); }}
              sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, color: TEAL, borderColor: TEAL }}
            >
              {s.enableLocation}
            </Button>
          ) : null}
        </Box>
      );
    }
    const list = result.nearby ?? [];
    return (
      <Box sx={cardSx}>
        <Typography sx={labelSx}>{s.nearbyTitle}</Typography>
        {list.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{s.noneNearby(result.nearbyRadiusKm ?? 25)}</Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {(showAllNearby ? list : list.slice(0, NEARBY_PREVIEW)).map(nearbyRow)}
            </Box>
            {list.length > NEARBY_PREVIEW && (
              <Button fullWidth onClick={() => setShowAllNearby(v => !v)} sx={{ mt: 0.5, textTransform: 'none', fontWeight: 700, color: TEAL }}>
                {showAllNearby ? s.showLess : s.showMore(list.length - NEARBY_PREVIEW)}
              </Button>
            )}
          </>
        )}
      </Box>
    );
  };

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

      <Box sx={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', p: 2, pb: 'calc(28px + env(safe-area-inset-bottom))' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {phase === 'idle' && (
            <Box sx={{ ...cardSx, textAlign: 'center', py: 4 }}>
              <QrCodeScannerRoundedIcon sx={{ fontSize: 48, color: TEAL, mb: 1 }} />
              <Typography sx={{ fontSize: 16, fontWeight: 800, mb: 0.5 }}>{s.idleTitle}</Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{s.idleBody}</Typography>
            </Box>
          )}

          {phase === 'loading' && <ShimmerList count={4} rowHeight={64} gap={10} />}

          {phase === 'notFound' && (
            <Box sx={{ ...cardSx, textAlign: 'center', py: 3 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 0.5 }}>{s.notFoundTitle}</Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{s.notFoundBody}</Typography>
            </Box>
          )}

          {phase === 'error' && (
            <Box sx={{ ...cardSx, textAlign: 'center', py: 3 }}>
              <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 1 }}>{s.error}</Typography>
              {barcode && (
                <Button onClick={() => void fetchPrices(barcode)} sx={{ textTransform: 'none', fontWeight: 700, color: TEAL }}>{s.retry}</Button>
              )}
            </Box>
          )}

          {phase === 'result' && result && (
            <>
              <Box sx={cardSx}>
                <Typography sx={{ fontSize: 17, fontWeight: 900, lineHeight: 1.3 }}>{result.productName}</Typography>
                <Typography dir="ltr" sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.25, textAlign: 'start' }}>{result.barcode}</Typography>
              </Box>

              {nearbySection()}

              <Box sx={cardSx}>
                <Typography sx={labelSx}>{s.cheapestTitle}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{result.cheapest.chainName}</Typography>
                    {result.cheapest.branch && (
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {[result.cheapest.branch.branchName, result.cheapest.branch.city].filter(Boolean).join(', ')}
                      </Typography>
                    )}
                  </Box>
                  <Typography sx={{ fontSize: 20, fontWeight: 900, color: TEAL }}>{formatILS(result.cheapest.price, 2)}</Typography>
                </Box>
              </Box>

              <Box sx={cardSx}>
                <Typography sx={labelSx}>{s.chainsTitle}</Typography>
                {result.chains.map((c) => (
                  <Box key={c.chainId} sx={{ display: 'flex', alignItems: 'center', py: 0.75, gap: 1, borderTop: '1px solid', borderColor: 'divider', '&:first-of-type': { borderTop: 'none' } }}>
                    <Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{c.chainName}</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{formatILS(c.typicalPrice, 2)}</Typography>
                  </Box>
                ))}
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 1 }}>{s.chainsNote}</Typography>
              </Box>

              <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center', px: 1 }}>{s.disclaimer}</Typography>
            </>
          )}

          <Button
            variant="contained" fullWidth startIcon={<QrCodeScannerRoundedIcon />} onClick={scanAgain}
            sx={{ borderRadius: '14px', py: 1.3, fontWeight: 800, textTransform: 'none', fontSize: 15 }}
          >
            {phase === 'idle' ? s.scan : s.scanAnother}
          </Button>
        </Box>
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
