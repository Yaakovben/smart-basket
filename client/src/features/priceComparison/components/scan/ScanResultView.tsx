import { useMemo, useState } from 'react';
import { Box, Typography, Button, ButtonBase, LinearProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import NavigationRoundedIcon from '@mui/icons-material/NavigationRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { formatILS, formatDateShort, formatUpdatedAt, haptic } from '../../../../global/helpers';
import type { Language } from '../../../../global/types';
import type { LocationStatus } from '../../hooks/useUserLocation';
import type { BarcodeScanResult, ScanNearbyBranch, ScanHere } from '../../types/priceComparison.types';
import type { PriceScanStrings } from '../../priceScan.strings';
import { scanCardSx, SCAN_TEAL } from './scanStyles';
import { PromoChip, PROMO_COLOR } from './ScanParts';
import { formatDistance, usefulPromo, effectivePrice } from './scanFormat';

const NEARBY_PREVIEW = 4;
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

interface NearbyGroup { key: string; rep: ScanNearbyBranch; others: ScanNearbyBranch[] }

const branchLine = (b: { branchName: string; city: string }) => [b.branchName, b.city].filter(Boolean).join(', ');
const round2 = (n: number) => Math.round(n * 100) / 100;
const sameBranch = (a: { chainId: string; storeId: string }, b: { chainId: string; storeId: string }) =>
  a.chainId === b.chainId && a.storeId === b.storeId;

// כותרת קטע: אייקון בריבוע צבעוני ושם הקטע
const SectionHeader = ({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
    <Box sx={{
      width: 30, height: 30, borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: alpha(SCAN_TEAL, 0.12), color: SCAN_TEAL,
    }}>
      {icon}
    </Box>
    <Typography sx={{ fontSize: 15, fontWeight: 900, flex: 1 }}>{title}</Typography>
    {children}
  </Box>
);

// תוצאת סריקה לפי הסדר: הסניף הכי זול, הסניפים הקרובים אליך, ודירוג הרשתות.
// רק עובדות: מחיר, מרחק, והאם המחיר אומת לסניף. בלי "המלצה" שהמשתמש צריך לסמוך עליה.
// מבצע מוצג רק כשהוא באמת זול מהמחיר הרגיל.
export const ScanResultView = ({
  s, lang, isDark, result, hasLocation, locating, refreshing, locationStatus, onEnableLocation, onNavigate,
}: Props) => {
  const [sort, setSort] = useState<SortMode>('price');
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const nearby = useMemo(() => result.nearby ?? [], [result.nearby]);
  // סניפים של אותה רשת באותו מחיר (בדרך כלל מחיר רשת שלא אומת לסניף) מוצגים
  // כשורה אחת: הסניף הקרוב, ו"ועוד N סניפים". בלי זה אותה רשת חזרה שבע פעמים
  // ברצף עם אותו מחיר, והרשימה הייתה ארוכה ומבלבלת.
  const groups = useMemo<NearbyGroup[]>(() => {
    const byKey = new Map<string, ScanNearbyBranch[]>();
    for (const b of nearby) {
      const key = `${b.chainId}|${b.chainName}|${effectivePrice(b.price, b.promo).price.toFixed(2)}|${b.verified ? 1 : 0}`;
      const arr = byKey.get(key);
      if (arr) arr.push(b); else byKey.set(key, [b]);
    }
    const list = [...byKey.entries()].map(([key, arr]) => {
      const branches = [...arr].sort((x, y) => x.distanceM - y.distanceM);
      return { key, rep: branches[0], others: branches.slice(1) };
    });
    const eff = (b: ScanNearbyBranch) => effectivePrice(b.price, b.promo).price;
    return sort === 'price'
      ? list.sort((x, y) => eff(x.rep) - eff(y.rep) || x.rep.distanceM - y.rep.distanceM)
      : list.sort((x, y) => x.rep.distanceM - y.rep.distanceM || eff(x.rep) - eff(y.rep));
  }, [nearby, sort]);
  const groupPrice = (g: NearbyGroup) => effectivePrice(g.rep.price, g.rep.promo).price;
  const nearbyMin = groups.length ? Math.min(...groups.map(groupPrice)) : null;
  // תווית "הכי זול באזור" רק כשיש הבדל במחירים. כשכל הסניפים באותו מחיר, שורה
  // אחת אומרת את זה, במקום תווית על כל שורה שכבר לא אומרת כלום.
  const allSamePrice = groups.length > 1 && nearbyMin !== null && groups.every((g) => groupPrice(g) <= nearbyMin + 0.005);
  // מבצע בסניף קרוב שזול אפילו מהמחיר הזול בארץ: הוא התשובה האמיתית לשאלה
  // "איפה הכי זול", ולכן הוא מוצג בכרטיס הראשי
  const promoBeatsNation = groups.length > 0 && nearbyMin !== null && nearbyMin < result.cheapest.price - 0.005
    ? [...groups].filter((g) => groupPrice(g) <= nearbyMin + 0.005).sort((x, y) => x.rep.distanceM - y.rep.distanceM)[0].rep
    : null;

  const { cheapest, chains, here } = result;
  const parentName = (chainId: string) => chains.find((c) => c.chainId === chainId && !c.isBrand)?.chainName ?? '';
  const priciest = useMemo(() => chains.reduce<typeof chains[number] | null>(
    (max, c) => (!max || c.typicalPrice > max.typicalPrice ? c : max), null,
  ), [chains]);
  const minChainPrice = chains.length ? Math.min(...chains.map((c) => c.typicalPrice)) : 0;
  const maxChainPrice = priciest?.typicalPrice ?? 0;
  // סניף קרוב שאפשר לנווט אליו מהכרטיס הראשי: הסניף הזול בארץ עצמו אם הוא
  // קרוב, וכשהזול הוא מחיר הרשת, הסניף הקרוב ביותר של אותה רשת באותו מחיר
  const cheapestNearby = cheapest.branch
    ? nearby.find((b) => b.chainId === cheapest.chainId && b.storeId === cheapest.branch!.storeId) ?? null
    : [...nearby]
      .filter((b) => b.chainId === cheapest.chainId && b.price <= cheapest.price + 0.005)
      .sort((x, y) => x.distanceM - y.distanceM)[0] ?? null;

  const blocked = locationStatus === 'blocked';
  const updated = formatUpdatedAt(result.pricesAsOf, lang);
  const hereInList = !!(here && nearby.some((b) => sameBranch(b, here)));

  const priceNote = (verified: boolean, onDark = false) => (
    verified
      ? <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, color: onDark ? 'rgba(255,255,255,0.92)' : SCAN_TEAL }}>
          <VerifiedRoundedIcon sx={{ fontSize: 12 }} />
          <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 700 }}>{s.branchPrice}</Typography>
        </Box>
      : <Typography component="span" sx={{ fontSize: 10.5, color: onDark ? 'rgba(255,255,255,0.85)' : 'text.disabled' }}>{s.chainPrice}</Typography>
  );

  const tag = (label: string, filled: boolean) => (
    <Typography component="span" sx={{
      fontSize: 10.5, fontWeight: 900, px: 0.75, py: 0.15, borderRadius: '6px', flexShrink: 0, whiteSpace: 'nowrap',
      ...(filled ? { color: '#fff', bgcolor: SCAN_TEAL } : { color: SCAN_TEAL, bgcolor: alpha(SCAN_TEAL, 0.12) }),
    }}>
      {label}
    </Typography>
  );

  const promoTag = (
    <Typography component="span" sx={{
      fontSize: 10.5, fontWeight: 900, px: 0.75, py: 0.15, borderRadius: '6px', flexShrink: 0, whiteSpace: 'nowrap',
      color: PROMO_COLOR, bgcolor: alpha(PROMO_COLOR, 0.12),
    }}>
      {s.promoTag}
    </Typography>
  );

  // ===== המוצר =====
  const productCard = (
    <Box sx={{ ...scanCardSx(isDark), position: 'relative', overflow: 'hidden' } as object}>
      <Typography sx={{ fontSize: 18, fontWeight: 900, lineHeight: 1.3 }}>{result.productName}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mt: 0.5, flexWrap: 'wrap' }}>
        <Typography dir="ltr" sx={{ fontSize: 11.5, color: 'text.disabled', letterSpacing: 0.5 }}>{result.barcode}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, color: updated.daysAgo >= 2 ? 'warning.main' : 'text.secondary' }}>
          <ScheduleRoundedIcon sx={{ fontSize: 13 }} />
          <Typography sx={{ fontSize: 11.5, fontWeight: 600 }}>{s.pricesUpdated(updated.text)}</Typography>
        </Box>
      </Box>
      {(refreshing || locating) && (
        <>
          <Typography sx={{ fontSize: 11.5, color: SCAN_TEAL, fontWeight: 700, mt: 0.75 }}>{refreshing ? s.refreshing : s.locating}</Typography>
          <LinearProgress sx={{ position: 'absolute', insetInline: 0, bottom: 0, height: 3, bgcolor: 'transparent', '& .MuiLinearProgress-bar': { bgcolor: SCAN_TEAL } }} />
        </>
      )}
    </Box>
  );

  // ===== 1. הסניף הכי זול =====
  const cheapestPromo = usefulPromo(chains.find((c) => c.chainId === cheapest.chainId && c.chainName === cheapest.chainName)?.promo, cheapest.price);
  const heroBranch = promoBeatsNation;
  const heroNav = heroBranch ?? cheapestNearby;
  const heroPrice = heroBranch ? effectivePrice(heroBranch.price, heroBranch.promo).price : cheapest.price;
  const heroSaving = priciest ? round2(priciest.typicalPrice - heroPrice) : 0;
  const hero = (
    <Box sx={{
      position: 'relative', overflow: 'hidden', borderRadius: '22px', p: 2.25, color: '#fff',
      background: isDark ? 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)' : 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
      boxShadow: isDark ? 'none' : '0 12px 28px rgba(13,148,136,0.3)',
      animation: 'scanHeroIn 0.35s ease-out',
      '@keyframes scanHeroIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
    }}>
      <Box aria-hidden sx={{ position: 'absolute', width: 170, height: 170, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)', top: -70, insetInlineStart: -50 }} />
      <Box aria-hidden sx={{ position: 'absolute', width: 90, height: 90, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)', bottom: -30, insetInlineEnd: 40 }} />
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.35, borderRadius: '999px', bgcolor: 'rgba(255,255,255,0.18)' }}>
          <EmojiEventsRoundedIcon sx={{ fontSize: 15, color: '#FDE68A' }} />
          <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{heroBranch || cheapest.branch ? s.cheapestBranchTitle : s.lowestFound}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, mt: 1.25 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1.2 }}>{heroBranch ? heroBranch.chainName : cheapest.chainName}</Typography>
            <Typography sx={{ fontSize: 12.5, opacity: 0.92, mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {heroBranch ? branchLine(heroBranch) : cheapest.branch ? branchLine(cheapest.branch) : s.nationMostBranches(cheapest.chainName)}
              {heroNav ? ` · ${formatDistance(s, heroNav.distanceM, heroNav.distanceKm)}` : ''}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
            {heroBranch && (
              <Typography sx={{ fontSize: 13, opacity: 0.75, textDecoration: 'line-through', lineHeight: 1.2 }}>{formatILS(heroBranch.price, 2)}</Typography>
            )}
            <Typography sx={{ fontSize: 36, fontWeight: 900, lineHeight: 0.95, letterSpacing: -0.5 }}>
              {formatILS(heroPrice, 2)}
            </Typography>
          </Box>
        </Box>
        {!heroBranch && cheapest.singleBranchDeal && (
          <Typography sx={{ fontSize: 12, mt: 1.25, p: 1, borderRadius: '12px', lineHeight: 1.5, bgcolor: 'rgba(255,255,255,0.14)' }}>
            {s.nationSingleBranch(parentName(cheapest.chainId) || cheapest.chainName, formatILS(cheapest.chainTypicalPrice, 2))}
          </Typography>
        )}
        {(heroSaving >= 0.1 || heroBranch || cheapestPromo) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.25 }}>
            {heroBranch && (
              <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.45, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.24)' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{s.promoTag}</Typography>
              </Box>
            )}
            {heroSaving >= 0.1 && priciest && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.45, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.18)' }}>
                <SavingsRoundedIcon sx={{ fontSize: 15 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{s.saveVsPriciest(formatILS(heroSaving, 2), priciest.chainName)}</Typography>
              </Box>
            )}
            {!heroBranch && cheapestPromo && <PromoChip s={s} promo={cheapestPromo} onDark />}
          </Box>
        )}
        {heroNav && (
          <Button
            fullWidth onClick={() => { haptic('light'); onNavigate(heroNav); }}
            sx={{ mt: 1.5, py: 1, gap: 1, borderRadius: '12px', textTransform: 'none', fontWeight: 800, fontSize: 15, bgcolor: '#fff', color: SCAN_TEAL, '&:hover': { bgcolor: '#F0FDFA' } }}
          >
            {/* רווח קבוע בין האייקון לטקסט (startIcon נצמד לטקסט בעברית) */}
            <NavigationRoundedIcon sx={{ fontSize: 20 }} />
            {s.navigate}
          </Button>
        )}
      </Box>
    </Box>
  );

  // ===== 2. הסניפים הקרובים אליך =====
  const row = (g: NearbyGroup) => {
    const b = g.rep;
    const eff = effectivePrice(b.price, b.promo);
    // מבצע שכבר נכלל במחיר לא מוצג שוב כתווית מחיר, רק מבצע מועדון או כמותי
    const promo = eff.promoApplied ? null : usefulPromo(b.promo, b.price);
    const isCheapestHere = !allSamePrice && nearbyMin !== null && eff.price <= nearbyMin + 0.005;
    const diff = nearbyMin !== null ? round2(eff.price - nearbyMin) : 0;
    const isHere = !!(here && [b, ...g.others].some((x) => sameBranch(x, here)));
    const open = expanded.has(g.key);
    return (
      <Box key={g.key} sx={{ borderRadius: '14px', bgcolor: isCheapestHere ? alpha(SCAN_TEAL, isDark ? 0.12 : 0.07) : 'transparent' }}>
        <ButtonBase
          onClick={() => { haptic('light'); onNavigate(b); }}
          sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1.25, p: 1.25, borderRadius: '14px', textAlign: 'start' }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.chainName}</Typography>
              {isCheapestHere && tag(s.nearbyCheapestTag, true)}
              {eff.promoApplied && promoTag}
              {isHere && tag(s.hereTag, false)}
            </Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {branchLine(b)} · {formatDistance(s, b.distanceM, b.distanceKm)}
            </Typography>
            {promo && <Box sx={{ mt: 0.4 }}><PromoChip s={s} promo={promo} /></Box>}
          </Box>
          <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
            {eff.promoApplied && (
              <Typography sx={{ fontSize: 11, color: 'text.disabled', textDecoration: 'line-through', lineHeight: 1.1 }}>{formatILS(b.price, 2)}</Typography>
            )}
            <Typography sx={{ fontSize: 16.5, fontWeight: 900, color: isCheapestHere ? SCAN_TEAL : eff.promoApplied ? PROMO_COLOR : 'text.primary' }}>{formatILS(eff.price, 2)}</Typography>
            {/* יקר מהזול באזור: בכמה. אחרת: האם המחיר אומת לסניף */}
            {diff >= 0.01 && !allSamePrice
              ? <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 700, color: 'warning.main', display: 'block' }}>{s.moreThanCheapest(formatILS(diff, 2))}</Typography>
              : priceNote(b.verified)}
          </Box>
          <NavigationRoundedIcon sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }} />
        </ButtonBase>
        {g.others.length > 0 && (
          <>
            <ButtonBase
              onClick={() => {
                haptic('light');
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(g.key)) next.delete(g.key); else next.add(g.key);
                  return next;
                });
              }}
              aria-expanded={open}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.25, px: 1.25, pb: 1, mt: -0.5, color: SCAN_TEAL, borderRadius: '8px' }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{s.sameChainMore(g.others.length)}</Typography>
              <ExpandMoreRoundedIcon sx={{ fontSize: 18, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
            </ButtonBase>
            {open && g.others.map((o) => (
              <ButtonBase
                key={`${o.chainId}:${o.storeId}`}
                onClick={() => { haptic('light'); onNavigate(o); }}
                sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.9, borderTop: '1px solid', borderColor: 'divider', textAlign: 'start' }}
              >
                <Typography sx={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {branchLine(o)} · {formatDistance(s, o.distanceM, o.distanceKm)}
                </Typography>
                {here && sameBranch(o, here) && tag(s.hereTag, false)}
                <NavigationRoundedIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
              </ButtonBase>
            ))}
          </>
        )}
      </Box>
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

  // הסניף שהמשתמש עומד בו ואין לו שורה ברשימה: הערה קצרה עם המחיר שם, אם יש
  const hereNote = here && !hereInList ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, p: 1, mb: 0.5, borderRadius: '12px', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)' }}>
      {tag(s.hereTag, false)}
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', flex: 1, minWidth: 0 }}>
        {here.price === null ? s.hereNoPrice(here.chainName) : `${here.chainName}: ${formatILS(here.price, 2)}`}
      </Typography>
    </Box>
  ) : null;

  let nearbySection: React.ReactNode;
  if (!hasLocation) {
    nearbySection = (
      <Box sx={scanCardSx(isDark)}>
        <SectionHeader icon={<PlaceRoundedIcon sx={{ fontSize: 18 }} />} title={s.nearbyTitle} />
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: blocked ? 0 : 1.25 }}>{blocked ? s.locationBlocked : s.locationPrompt}</Typography>
        {!blocked && (
          <Button
            variant="outlined" fullWidth
            disabled={locationStatus === 'requesting'} onClick={onEnableLocation}
            sx={{ gap: 1, borderRadius: '12px', textTransform: 'none', fontWeight: 700, color: SCAN_TEAL, borderColor: SCAN_TEAL }}
          >
            <MyLocationRoundedIcon sx={{ fontSize: 20 }} />
            {s.enableLocation}
          </Button>
        )}
      </Box>
    );
  } else {
    nearbySection = (
      <Box sx={scanCardSx(isDark)}>
        <SectionHeader icon={<PlaceRoundedIcon sx={{ fontSize: 18 }} />} title={s.nearbyTitle}>
          {groups.length > 1 && sortChip('price', s.sortCheapest)}
          {groups.length > 1 && sortChip('distance', s.sortClosest)}
        </SectionHeader>
        {hereNote}
        {allSamePrice && nearbyMin !== null && (
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: SCAN_TEAL, px: 0.5, mb: 0.75 }}>{s.allSamePrice(formatILS(nearbyMin, 2))}</Typography>
        )}
        {nearby.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{s.noneNearby(result.nearbyRadiusKm ?? 25)}</Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {(showAll ? groups : groups.slice(0, NEARBY_PREVIEW)).map(row)}
            </Box>
            {groups.length > NEARBY_PREVIEW && (
              <Button fullWidth onClick={() => setShowAll((v) => !v)} sx={{ mt: 0.5, textTransform: 'none', fontWeight: 700, color: SCAN_TEAL }}>
                {showAll ? s.showLess : s.showMore(groups.length - NEARBY_PREVIEW)}
              </Button>
            )}
          </>
        )}
      </Box>
    );
  }

  // ===== 3. דירוג הרשתות: מקום, מחיר, ופס שמראה את ההפרש במבט אחד =====
  const span = Math.max(0.01, maxChainPrice - minChainPrice);
  const chainsSection = (
    <Box sx={scanCardSx(isDark)}>
      <SectionHeader icon={<LeaderboardRoundedIcon sx={{ fontSize: 18 }} />} title={s.chainsRankTitle} />
      {chains.map((c, i) => {
        const isMin = c.typicalPrice <= minChainPrice + 0.005;
        const lower = c.minPrice < c.typicalPrice - 0.005;
        const promo = usefulPromo(c.promo, c.typicalPrice);
        const chainUpdated = formatUpdatedAt(c.updatedAt, lang);
        // 35% לזול ביותר ועד 100% ליקר ביותר, כדי שגם הזול ייראה
        const width = 35 + ((c.typicalPrice - minChainPrice) / span) * 65;
        return (
          <Box key={c.key} sx={{ display: 'flex', gap: 1.25, py: 1.1, borderTop: i === 0 ? 'none' : '1px solid', borderColor: 'divider' }}>
            <Box sx={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0, mt: '1px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900,
              ...(isMin ? { bgcolor: SCAN_TEAL, color: '#fff' } : { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)', color: 'text.secondary' }),
            }}>
              {i + 1}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.chainName}</Typography>
                  {isMin && tag(s.cheapestBadge, true)}
                </Box>
                <Typography sx={{ fontSize: 15, fontWeight: 900, color: isMin ? SCAN_TEAL : 'text.primary', flexShrink: 0 }}>{formatILS(c.typicalPrice, 2)}</Typography>
              </Box>
              <Box sx={{ mt: 0.6, height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)', overflow: 'hidden' }}>
                <Box sx={{
                  height: '100%', width: `${width}%`, borderRadius: 3,
                  bgcolor: isMin ? SCAN_TEAL : (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.18)'),
                }} />
              </Box>
              {c.isBrand && <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.4 }}>{s.brandOf(parentName(c.chainId))}</Typography>}
              {lower && (
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.3 }}>
                  {c.cheapestBranch ? s.chainFromBranch(formatILS(c.minPrice, 2), c.cheapestBranch.branchName) : s.chainFromSome(formatILS(c.minPrice, 2))}
                </Typography>
              )}
              {chainUpdated.daysAgo >= 1 && (
                <Typography sx={{ fontSize: 11, color: c.stale ? 'warning.main' : 'text.disabled', mt: 0.2 }}>{s.chainUpdated(chainUpdated.text)}</Typography>
              )}
              {promo && <Box sx={{ mt: 0.5 }}><PromoChip s={s} promo={promo} someBranches={!c.promoAllBranches} /></Box>}
            </Box>
          </Box>
        );
      })}
      <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 1 }}>{s.chainsNote}</Typography>
    </Box>
  );

  return (
    <>
      {result.stale && (
        <Box sx={{
          display: 'flex', alignItems: 'flex-start', gap: 1, p: 1.25, borderRadius: '14px',
          bgcolor: isDark ? 'rgba(245,158,11,0.14)' : '#FFFBEB', color: isDark ? '#FCD34D' : '#92400E',
        }}>
          <ScheduleRoundedIcon sx={{ fontSize: 18, mt: '1px' }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{s.staleBanner(formatDateShort(result.pricesAsOf, lang))}</Typography>
        </Box>
      )}
      {productCard}
      {hero}
      {nearbySection}
      {chainsSection}
      <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center', px: 1 }}>{s.disclaimer}</Typography>
    </>
  );
};
