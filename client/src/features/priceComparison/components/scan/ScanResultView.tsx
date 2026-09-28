import { useMemo, useState } from 'react';
import { Box, Typography, Button, ButtonBase } from '@mui/material';
import NavigationRoundedIcon from '@mui/icons-material/NavigationRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import { formatILS, haptic } from '../../../../global/helpers';
import type { LocationStatus } from '../../hooks/useUserLocation';
import type { BarcodeScanResult, ScanNearbyBranch } from '../../types/priceComparison.types';
import type { PriceScanStrings } from '../../priceScan.strings';
import { scanCardSx, scanLabelSx, SCAN_TEAL } from './scanStyles';

const NEARBY_PREVIEW = 3;
type SortMode = 'price' | 'distance';

interface Props {
  s: PriceScanStrings;
  isDark: boolean;
  result: BarcodeScanResult;
  hasLocation: boolean;
  locationStatus: LocationStatus;
  onEnableLocation: () => void;
  onNavigate: (b: ScanNearbyBranch) => void;
}

// תוצאת סריקה: קודם התשובה עצמה (כרטיס בולט), ואחריה הפירוט.
export const ScanResultView = ({ s, isDark, result, hasLocation, locationStatus, onEnableLocation, onNavigate }: Props) => {
  const [sort, setSort] = useState<SortMode>('price');
  const [showAll, setShowAll] = useState(false);
  const nearby = useMemo(() => result.nearby ?? [], [result.nearby]);
  const best = nearby[0] ?? null; // השרת כבר מחזיר מהזול ליקר

  const sorted = useMemo(() => (
    sort === 'price'
      ? nearby
      : [...nearby].sort((a, b) => a.distanceKm - b.distanceKm || a.price - b.price)
  ), [nearby, sort]);

  const saving = best && result.nearbyMaxPrice !== null ? Math.round((result.nearbyMaxPrice - best.price) * 100) / 100 : 0;
  const blocked = locationStatus === 'blocked';

  const hero = best ? (
    <Box sx={{
      borderRadius: '20px', p: 2, color: '#fff',
      background: isDark ? 'linear-gradient(135deg, #0F766E, #115E59)' : 'linear-gradient(135deg, #14B8A6, #0D9488)',
      boxShadow: isDark ? 'none' : '0 10px 24px rgba(13,148,136,0.28)',
    }}>
      <Typography sx={{ fontSize: 12, fontWeight: 800, opacity: 0.9 }}>{s.bestNearTitle}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mt: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 900, lineHeight: 1.2 }}>{best.chainName}</Typography>
          <Typography sx={{ fontSize: 12.5, opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[best.branchName, best.city].filter(Boolean).join(', ')} · {s.km(best.distanceKm)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
          <Typography sx={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{formatILS(best.price, 2)}</Typography>
          {!best.verified && <Typography sx={{ fontSize: 10.5, opacity: 0.85 }}>{s.chainPrice}</Typography>}
        </Box>
      </Box>
      {saving >= 0.1 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.25, px: 1, py: 0.5, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.16)', width: 'fit-content' }}>
          <SavingsRoundedIcon sx={{ fontSize: 15 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{s.saveUpTo(formatILS(saving, 2))}</Typography>
        </Box>
      )}
      <Button
        fullWidth startIcon={<NavigationRoundedIcon />} onClick={() => { haptic('light'); onNavigate(best); }}
        sx={{ mt: 1.5, borderRadius: '12px', textTransform: 'none', fontWeight: 800, bgcolor: '#fff', color: SCAN_TEAL, '&:hover': { bgcolor: '#F0FDFA' } }}
      >
        {s.navigate}
      </Button>
    </Box>
  ) : null;

  const row = (b: ScanNearbyBranch) => {
    const isBest = best !== null && b === best;
    return (
      <ButtonBase
        key={`${b.chainId}:${b.storeId}`}
        onClick={() => { haptic('light'); onNavigate(b); }}
        sx={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 1.25, p: 1.25, borderRadius: '14px', textAlign: 'start',
          bgcolor: isBest ? (isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.07)') : 'transparent',
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.chainName}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[b.branchName, b.city].filter(Boolean).join(', ')} · {s.km(b.distanceKm)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 900, color: isBest ? SCAN_TEAL : 'text.primary' }}>{formatILS(b.price, 2)}</Typography>
          {!b.verified && <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{s.chainPrice}</Typography>}
        </Box>
        <NavigationRoundedIcon sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }} />
      </ButtonBase>
    );
  };

  const sortChip = (mode: SortMode, label: string) => (
    <ButtonBase
      onClick={() => { haptic('light'); setSort(mode); }}
      aria-pressed={sort === mode}
      sx={{
        px: 1.25, py: 0.4, borderRadius: '999px', fontSize: 12, fontWeight: 700,
        bgcolor: sort === mode ? SCAN_TEAL : 'transparent',
        color: sort === mode ? '#fff' : 'text.secondary',
        border: '1px solid', borderColor: sort === mode ? SCAN_TEAL : 'divider',
      }}
    >
      {label}
    </ButtonBase>
  );

  return (
    <>
      <Box sx={scanCardSx(isDark)}>
        <Typography sx={{ fontSize: 17, fontWeight: 900, lineHeight: 1.3 }}>{result.productName}</Typography>
        <Typography dir="ltr" sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.25, textAlign: 'start' }}>{result.barcode}</Typography>
      </Box>

      {hero}

      {!hasLocation ? (
        <Box sx={scanCardSx(isDark)}>
          <Typography sx={scanLabelSx}>{s.nearbyTitle}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: blocked ? 0 : 1.25 }}>{blocked ? s.locationBlocked : s.locationPrompt}</Typography>
          {!blocked && (
            <Button
              variant="outlined" fullWidth startIcon={<MyLocationRoundedIcon />}
              disabled={locationStatus === 'requesting'} onClick={onEnableLocation}
              sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, color: SCAN_TEAL, borderColor: SCAN_TEAL }}
            >
              {s.enableLocation}
            </Button>
          )}
        </Box>
      ) : nearby.length === 0 ? (
        <Box sx={scanCardSx(isDark)}>
          <Typography sx={scanLabelSx}>{s.nearbyTitle}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{s.noneNearby(result.nearbyRadiusKm ?? 25)}</Typography>
        </Box>
      ) : nearby.length > 1 ? (
        <Box sx={scanCardSx(isDark)}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            <Typography sx={{ ...scanLabelSx, mb: 0, flex: 1 } as object}>{s.nearbyTitle}</Typography>
            {sortChip('price', s.sortCheapest)}
            {sortChip('distance', s.sortClosest)}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            {(showAll ? sorted : sorted.slice(0, NEARBY_PREVIEW)).map(row)}
          </Box>
          {sorted.length > NEARBY_PREVIEW && (
            <Button fullWidth onClick={() => setShowAll((v) => !v)} sx={{ mt: 0.5, textTransform: 'none', fontWeight: 700, color: SCAN_TEAL }}>
              {showAll ? s.showLess : s.showMore(sorted.length - NEARBY_PREVIEW)}
            </Button>
          )}
        </Box>
      ) : null}

      <Box sx={scanCardSx(isDark)}>
        <Typography sx={scanLabelSx}>{s.bestNationTitle}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{result.cheapest.chainName}</Typography>
            {result.cheapest.branch && (
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {[result.cheapest.branch.branchName, result.cheapest.branch.city].filter(Boolean).join(', ')}
              </Typography>
            )}
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 900, color: SCAN_TEAL }}>{formatILS(result.cheapest.price, 2)}</Typography>
        </Box>
      </Box>

      <Box sx={scanCardSx(isDark)}>
        <Typography sx={scanLabelSx}>{s.chainsTitle}</Typography>
        {result.chains.map((c, i) => (
          <Box key={c.chainId} sx={{ display: 'flex', alignItems: 'center', py: 0.75, gap: 1, borderTop: i === 0 ? 'none' : '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{c.chainName}</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: i === 0 ? SCAN_TEAL : 'text.primary' }}>{formatILS(c.typicalPrice, 2)}</Typography>
          </Box>
        ))}
        <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 1 }}>{s.chainsNote}</Typography>
      </Box>

      <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center', px: 1 }}>{s.disclaimer}</Typography>
    </>
  );
};
