import { useMemo, useState } from 'react';
import { Box, Typography, Button, ButtonBase, LinearProgress } from '@mui/material';
import NavigationRoundedIcon from '@mui/icons-material/NavigationRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { formatILS, formatDateShort, haptic } from '../../../../global/helpers';
import type { Language } from '../../../../global/types';
import type { LocationStatus } from '../../hooks/useUserLocation';
import type { BarcodeScanResult, ScanNearbyBranch, ScanHere } from '../../types/priceComparison.types';
import type { PriceScanStrings } from '../../priceScan.strings';
import { scanCardSx, scanLabelSx, SCAN_TEAL } from './scanStyles';
import { PromoChip } from './ScanParts';
import { formatDistance } from './scanFormat';

const NEARBY_PREVIEW = 3;
type SortMode = 'price' | 'distance';

interface Props {
  s: PriceScanStrings;
  lang: Language;
  isDark: boolean;
  result: BarcodeScanResult;
  hasLocation: boolean;
  // מאתרים מיקום מדויק (עוד לא הגיע מיקום חי)
  locating: boolean;
  refreshing: boolean;
  locationStatus: LocationStatus;
  onEnableLocation: () => void;
  onNavigate: (b: ScanNearbyBranch | ScanHere) => void;
}

const branchLine = (b: { branchName: string; city: string }) => [b.branchName, b.city].filter(Boolean).join(', ');

// תוצאת סריקה: קודם הסניף שהמשתמש נמצא בו, אחר כך התשובה (הכי זול קרוב), ואז הפירוט.
// כל מחיר מסומן אם הוא מחיר הסניף או רק מחיר ברשת, וכל מחיר חריג מוסבר.
export const ScanResultView = ({
  s, lang, isDark, result, hasLocation, locating, refreshing, locationStatus, onEnableLocation, onNavigate,
}: Props) => {
  const [sort, setSort] = useState<SortMode>('price');
  const [showAll, setShowAll] = useState(false);
  const nearby = useMemo(() => result.nearby ?? [], [result.nearby]);
  // הכי זול קרוב: עדיפות למחיר שאומת לסניף. מחיר רשת משוער לא מוצג כ"תשובה"
  // כשיש סניף עם מחיר מאומת (השרת כבר ממיין מהזול ליקר)
  const best = useMemo(() => nearby.find((b) => b.verified) ?? nearby[0] ?? null, [nearby]);

  const sorted = useMemo(() => (
    sort === 'price' ? nearby : [...nearby].sort((a, b) => a.distanceM - b.distanceM || a.price - b.price)
  ), [nearby, sort]);

  const saving = best && result.nearbyMaxPrice !== null ? Math.round((result.nearbyMaxPrice - best.price) * 100) / 100 : 0;
  const blocked = locationStatus === 'blocked';
  const here = result.here;
  const hereIsBest = !!(here && best && here.storeId === best.storeId && here.chainId === best.chainId);
  const hereSaving = here && here.price !== null && best && !hereIsBest ? Math.round((here.price - best.price) * 100) / 100 : 0;
  const date = (iso: string) => formatDateShort(iso, lang);

  const priceNote = (verified: boolean, onDark = false) => (
    verified
      ? <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, color: onDark ? 'rgba(255,255,255,0.9)' : SCAN_TEAL }}>
          <VerifiedRoundedIcon sx={{ fontSize: 12 }} />
          <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 700 }}>{s.branchPrice}</Typography>
        </Box>
      : <Typography component="span" sx={{ fontSize: 10.5, color: onDark ? 'rgba(255,255,255,0.85)' : 'text.disabled' }}>{s.chainPrice}</Typography>
  );

  const hereCard = here ? (
    <Box sx={{ ...scanCardSx(isDark), borderColor: SCAN_TEAL, borderWidth: 1.5 } as object}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75, color: SCAN_TEAL }}>
        <StorefrontRoundedIcon sx={{ fontSize: 18 }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 900 }}>{s.hereTitle}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 900 }}>{here.chainName}</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{branchLine(here)}</Typography>
        </Box>
        {here.price !== null && (
          <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
            <Typography sx={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{formatILS(here.price, 2)}</Typography>
            {priceNote(here.verified)}
          </Box>
        )}
      </Box>
      {here.promo && <Box sx={{ mt: 1 }}><PromoChip s={s} promo={here.promo} /></Box>}
      {here.price === null ? (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.75 }}>{s.hereNoPrice(here.chainName)}</Typography>
      ) : hereIsBest ? (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: SCAN_TEAL, mt: 0.75 }}>{s.hereIsCheapest}</Typography>
      ) : best && hereSaving >= 0.1 ? (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'warning.main', mt: 0.75 }}>
          {s.hereCheaperNearby(best.chainName, formatILS(best.price, 2), formatILS(hereSaving, 2))}
        </Typography>
      ) : null}
    </Box>
  ) : null;

  // בלי כרטיס "הכי זול קרוב" כשזה בדיוק הסניף שהמשתמש עומד בו (כבר מוצג למעלה)
  const hero = best && !hereIsBest ? (
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
            {branchLine(best)} · {formatDistance(s, best.distanceM, best.distanceKm)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
          <Typography sx={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{formatILS(best.price, 2)}</Typography>
          {priceNote(best.verified, true)}
        </Box>
      </Box>
      {(best.promo || saving >= 0.1) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.25 }}>
          {best.promo && <PromoChip s={s} promo={best.promo} onDark />}
          {saving >= 0.1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.4, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.16)' }}>
              <SavingsRoundedIcon sx={{ fontSize: 15 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{s.saveUpTo(formatILS(saving, 2))}</Typography>
            </Box>
          )}
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
            {branchLine(b)} · {formatDistance(s, b.distanceM, b.distanceKm)}
          </Typography>
          {b.promo && <Box sx={{ mt: 0.4 }}><PromoChip s={s} promo={b.promo} /></Box>}
        </Box>
        <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 900, color: isBest ? SCAN_TEAL : 'text.primary' }}>{formatILS(b.price, 2)}</Typography>
          {priceNote(b.verified)}
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

  const { cheapest } = result;
  const parentName = (chainId: string) => result.chains.find((c) => c.chainId === chainId && !c.isBrand)?.chainName ?? '';

  return (
    <>
      {result.stale && (
        <Box sx={{
          display: 'flex', alignItems: 'flex-start', gap: 1, p: 1.25, borderRadius: '14px',
          bgcolor: isDark ? 'rgba(245,158,11,0.14)' : '#FFFBEB', color: isDark ? '#FCD34D' : '#92400E',
        }}>
          <ScheduleRoundedIcon sx={{ fontSize: 18, mt: '1px' }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{s.staleBanner(date(result.pricesAsOf))}</Typography>
        </Box>
      )}

      <Box sx={{ ...scanCardSx(isDark), position: 'relative', overflow: 'hidden' } as object}>
        <Typography sx={{ fontSize: 17, fontWeight: 900, lineHeight: 1.3 }}>{result.productName}</Typography>
        <Typography dir="ltr" sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.25, textAlign: 'start' }}>{result.barcode}</Typography>
        {(refreshing || locating) && (
          <>
            <Typography sx={{ fontSize: 11.5, color: SCAN_TEAL, fontWeight: 700, mt: 0.75 }}>{refreshing ? s.refreshing : s.locating}</Typography>
            <LinearProgress sx={{ position: 'absolute', insetInline: 0, bottom: 0, height: 3, bgcolor: 'transparent', '& .MuiLinearProgress-bar': { bgcolor: SCAN_TEAL } }} />
          </>
        )}
      </Box>

      {hereCard}
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
            <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{cheapest.chainName}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {cheapest.branch ? branchLine(cheapest.branch) : s.nationMostBranches(cheapest.chainName)}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 900, color: SCAN_TEAL }}>{formatILS(cheapest.price, 2)}</Typography>
        </Box>
        {cheapest.singleBranchDeal && (
          <Typography sx={{
            fontSize: 12, mt: 1, p: 1, borderRadius: '10px', lineHeight: 1.5,
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)', color: 'text.secondary',
          }}>
            {s.nationSingleBranch(parentName(cheapest.chainId) || cheapest.chainName, formatILS(cheapest.chainTypicalPrice, 2))}
          </Typography>
        )}
      </Box>

      <Box sx={scanCardSx(isDark)}>
        <Typography sx={scanLabelSx}>{s.chainsTitle}</Typography>
        {result.chains.map((c, i) => {
          const lower = c.minPrice < c.typicalPrice - 0.005;
          return (
            <Box key={c.key} sx={{ display: 'flex', alignItems: 'flex-start', py: 0.9, gap: 1, borderTop: i === 0 ? 'none' : '1px solid', borderColor: 'divider' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{c.chainName}</Typography>
                {c.isBrand && <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{s.brandOf(parentName(c.chainId))}</Typography>}
                {lower && (
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                    {c.cheapestBranch ? s.chainFromBranch(formatILS(c.minPrice, 2), c.cheapestBranch.branchName) : s.chainFromSome(formatILS(c.minPrice, 2))}
                  </Typography>
                )}
                {c.stale && <Typography sx={{ fontSize: 11, color: 'warning.main' }}>{s.chainStale(date(c.updatedAt))}</Typography>}
                {c.promo && <Box sx={{ mt: 0.4 }}><PromoChip s={s} promo={c.promo} someBranches={!c.promoAllBranches} /></Box>}
              </Box>
              <Typography sx={{ fontSize: 14.5, fontWeight: 900, color: i === 0 ? SCAN_TEAL : 'text.primary', flexShrink: 0 }}>{formatILS(c.typicalPrice, 2)}</Typography>
            </Box>
          );
        })}
        <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 1 }}>{s.chainsNote}</Typography>
      </Box>

      <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center', px: 1 }}>{s.disclaimer}</Typography>
    </>
  );
};
