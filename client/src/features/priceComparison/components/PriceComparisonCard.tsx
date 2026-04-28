/**
 * PriceComparisonCard — עיצוב מחדש (mobile-first).
 *
 * 3 שכבות בלבד:
 *  1. Hero - חיסכון ברור מאוד + הרשת הזולה
 *  2. Cards stack - כרטיס לכל רשת, ממוין מהזול ליקר, לחיצה פותחת פירוט inline
 *  3. Footer chip - מטא: עדכון אחרון, מקור, דיווח
 *
 * אין טבלאות, אין modals. כל אינטראקציה inline.
 */

import { memo, useState, useCallback } from 'react';
import { Box, Typography, Paper, Link, Button, CircularProgress, Collapse, keyframes } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NearMeIcon from '@mui/icons-material/NearMe';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { PriceComparisonData, PriceChainTotal, PriceMatch, NearestBranch } from '../types/priceComparison.types';
import type { LocationStatus } from '../hooks/useUserLocation';
import { BetaBadge } from './BetaBadge';
import { NavigationPicker } from './ChainComparisonTable';
import { haptic } from '../../../global/helpers';

const fadeIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`;
const shineGlow = keyframes`
  0%, 100% { box-shadow: 0 6px 22px rgba(16,185,129,0.35); }
  50% { box-shadow: 0 8px 28px rgba(16,185,129,0.55); }
`;

interface Props {
  data: PriceComparisonData | null;
  loading?: boolean;
  isDark?: boolean;
  locationStatus?: LocationStatus;
  onRequestLocation?: () => void;
  onResetLocationDenied?: () => void;
}

// פורמט יחסי קצר לזמן הצגה
const formatRelative = (iso: string | null): string => {
  if (!iso) return 'לא ידוע';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'זה עתה';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `לפני ${mins || 1} דק'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
};

// אייקון דירוג לכל רשת (1=מנצחת, 2-3=מקום קרוב, 4+=מספר בתוך עיגול)
const RankBadge = memo(({ rank, isWinner }: { rank: number; isWinner: boolean }) => {
  if (isWinner) {
    return (
      <Box className="chain-rank" sx={{
        width: 38, height: 38, borderRadius: '50%',
        background: 'linear-gradient(135deg, #FCD34D, #F59E0B)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(245,158,11,0.45)',
        fontSize: 20,
      }}>
        👑
      </Box>
    );
  }
  return (
    <Box className="chain-rank" sx={{
      width: 38, height: 38, borderRadius: '50%',
      bgcolor: 'rgba(20,184,166,0.1)',
      border: '1.5px solid rgba(20,184,166,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontSize: 14, fontWeight: 800,
      color: '#0F766E',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {rank}
    </Box>
  );
});
RankBadge.displayName = 'RankBadge';

// שורת מוצר בתוך כרטיס מורחב - שם + מחיר. אם לא נמצא: מוצג בעמום.
const ProductRow = memo(({ match, isDark }: { match: PriceMatch; isDark: boolean }) => {
  if (!match.matched) {
    return (
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, py: 0.6, px: 1,
        borderRadius: '8px',
        bgcolor: isDark ? 'rgba(245,158,11,0.04)' : 'rgba(245,158,11,0.03)',
      }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#F59E0B', opacity: 0.5, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 12, color: 'text.secondary', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.userProductName}
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: '#D97706', fontWeight: 700, flexShrink: 0 }}>
          לא נמצא
        </Typography>
      </Box>
    );
  }
  const subtotal = match.price * match.userQuantity;
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1, py: 0.6, px: 1,
      borderRadius: '8px',
    }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10B981', flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.userProductName}
        </Typography>
        {match.userQuantity > 1 && (
          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
            ×{match.userQuantity} = ₪{subtotal.toFixed(2)}
          </Typography>
        )}
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#0F766E', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        ₪{match.price.toFixed(2)}
      </Typography>
    </Box>
  );
});
ProductRow.displayName = 'ProductRow';

// כרטיס בודד לרשת - סגור: רנק + שם + מחיר + פער. פתוח: פירוט מוצרים + סניף.
interface ChainCardProps {
  chain: PriceChainTotal;
  rank: number;
  isWinner: boolean;
  cheapestTotal: number;
  isDark: boolean;
  expanded: boolean;
  onToggle: () => void;
  onOpenNav: (b: NearestBranch) => void;
}

const ChainCard = memo(({ chain, rank, isWinner, cheapestTotal, isDark, expanded, onToggle, onOpenNav }: ChainCardProps) => {
  const delta = chain.total - cheapestTotal;
  const hasMatches = chain.matchedCount > 0;

  // צבעי רקע לפי רנק - מנצח קבל ברק זהוב, אחרים נייטרלי
  const cardBg = isWinner
    ? (isDark ? 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(20,184,166,0.08))' : 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(20,184,166,0.04))')
    : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)');
  const cardBorder = isWinner
    ? (isDark ? 'rgba(16,185,129,0.45)' : 'rgba(16,185,129,0.4)')
    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)');

  const handleNavigate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!chain.nearestBranch) return;
    // פותח picker עם Waze/Google Maps/Apple Maps - לא יורד ישר ל-Google
    onOpenNav(chain.nearestBranch);
  }, [chain.nearestBranch, onOpenNav]);

  return (
    <Box
      onClick={() => { haptic('light'); onToggle(); }}
      sx={{
        borderRadius: '14px',
        background: cardBg,
        border: '1.5px solid',
        borderColor: cardBorder,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.1s',
        '&:active': { transform: 'scale(0.99)' },
        ...(isWinner ? { animation: `${shineGlow} 3s ease-in-out infinite` } : {}),
        // מסכים זעירים - דחיסה לכל הפרטים בכרטיס
        '@media (max-width: 360px)': {
          borderRadius: '12px',
          '& .chain-rank': { width: '32px !important', height: '32px !important', fontSize: '12px !important' },
          '& .chain-name': { fontSize: '13px !important' },
          '& .chain-meta': { fontSize: '10px !important' },
          '& .chain-price': { fontSize: '16px !important' },
        },
        '@media (max-width: 320px)': {
          '& .chain-rank': { width: '28px !important', height: '28px !important', fontSize: '11px !important' },
          '& .chain-name': { fontSize: '12px !important' },
          '& .chain-meta': { fontSize: '9.5px !important' },
          '& .chain-price': { fontSize: '14px !important' },
        },
      }}
    >
      {/* שורת ה-summary - תמיד נראית */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.25,
        p: 1.5,
        '@media (max-width: 360px)': { p: 1, gap: 0.85 },
        '@media (max-width: 320px)': { p: 0.75, gap: 0.65 },
      }}>
        <RankBadge rank={rank} isWinner={isWinner} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography className="chain-name" sx={{
            fontSize: 14.5, fontWeight: 800,
            color: 'text.primary',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {chain.chainName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.2 }}>
            {hasMatches ? (
              <Typography className="chain-meta" sx={{ fontSize: 11, color: 'text.secondary' }}>
                {chain.matchedCount} מוצרים
                {!chain.isComplete && chain.unmatchedCount > 0 && (
                  <Typography component="span" sx={{ fontSize: 10.5, color: '#D97706', fontWeight: 700, ml: 0.5 }}>
                    · חסר {chain.unmatchedCount}
                  </Typography>
                )}
              </Typography>
            ) : (
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                {chain.hasData ? 'אין התאמות' : 'לא פורסם'}
              </Typography>
            )}
            {chain.nearestBranch && (
              <>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>·</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                  <NearMeIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontWeight: 600 }}>
                    {chain.nearestBranch.distanceKm.toFixed(1)} ק"מ
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>

        {/* מחיר וחץ */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Box sx={{ textAlign: 'left' }}>
            {hasMatches ? (
              <>
                <Typography className="chain-price" sx={{
                  fontSize: 19, fontWeight: 900,
                  color: isWinner ? '#059669' : 'text.primary',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.1,
                }}>
                  ₪{chain.total.toFixed(0)}
                </Typography>
                {!isWinner && delta > 0 && chain.isComplete && (
                  <Typography sx={{ fontSize: 10.5, color: '#DC2626', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    +₪{delta.toFixed(0)}
                  </Typography>
                )}
              </>
            ) : (
              <Typography sx={{ fontSize: 12, color: 'text.disabled', fontWeight: 600 }}>
                —
              </Typography>
            )}
          </Box>
          <ExpandMoreIcon
            sx={{
              fontSize: 22,
              color: 'text.disabled',
              transition: 'transform 0.2s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </Box>
      </Box>

      {/* תוכן מורחב - רשימת מוצרים + סניף קרוב */}
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{
          px: 1.5, pb: 1.5,
          borderTop: '1px dashed',
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }}>
          {/* סניף קרוב + ניווט */}
          {chain.nearestBranch && (
            <Box sx={{
              mt: 1.25, p: 1, borderRadius: '10px',
              bgcolor: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.06)',
              border: '1px solid rgba(124,58,237,0.2)',
              display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <StorefrontIcon sx={{ fontSize: 18, color: '#7C3AED' }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {chain.nearestBranch.branchName}
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {chain.nearestBranch.address}, {chain.nearestBranch.city}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="contained"
                onClick={handleNavigate}
                startIcon={<NearMeIcon sx={{ fontSize: 15 }} />}
                sx={{
                  bgcolor: '#7C3AED',
                  '&:hover': { bgcolor: '#6D28D9' },
                  fontSize: 11, fontWeight: 800,
                  textTransform: 'none',
                  borderRadius: '8px', px: 1.25, py: 0.5,
                  flexShrink: 0,
                  minWidth: 0,
                  '& .MuiButton-startIcon': { mr: 0.4 },
                }}
              >
                ניווט
              </Button>
            </Box>
          )}

          {/* רשימת מוצרים */}
          {hasMatches ? (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {chain.matches.map((m) => (
                <ProductRow key={`${m.productId}-${m.chainId}`} match={m} isDark={isDark} />
              ))}
            </Box>
          ) : (
            <Box sx={{
              mt: 1.25, p: 1.25, borderRadius: '8px',
              bgcolor: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)',
              textAlign: 'center',
            }}>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                {chain.hasData
                  ? 'לא הצלחנו לזהות מוצרים מהרשימה ברשת זו'
                  : 'הרשת לא פרסמה מחירים היום - ננסה שוב בקרוב'}
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
});
ChainCard.displayName = 'ChainCard';

type SortMode = 'distance' | 'price' | 'combined';

export const PriceComparisonCard = memo(({ data, loading, isDark = false, locationStatus, onRequestLocation, onResetLocationDenied }: Props) => {
  // הזולה לא נפתחת אוטומטית - הלקוח מחליט מתי לחקור
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // מצב מיון - ברירת המחדל "קרוב" (נופל ל-price אם אין מיקום)
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  // ה-branch שנבחר לפתיחת picker ניווט (Waze/Google/Apple)
  const [navBranch, setNavBranch] = useState<NearestBranch | null>(null);

  if (loading || !data) return null;

  const freshness = formatRelative(data.lastUpdatedISO);
  const hasChainData = data.chainTotals?.some(c => c.matchedCount > 0) ?? false;
  const hasAnyPendingItems = data.totalPending > 0;

  // הזולה והפער המקסימלי לתצוגת hero
  const cheapest = data.chainTotals?.find(c => c.isCheapest);
  const completeChains = data.chainTotals?.filter(c => c.isComplete && c.matchedCount > 0) ?? [];
  const maxTotal = completeChains.length > 1 ? Math.max(...completeChains.map(c => c.total)) : 0;
  const savings = cheapest && maxTotal > cheapest.total ? maxTotal - cheapest.total : 0;

  // האם יש מיקום לפחות לרשת אחת - מאפשר מיון "קרוב" / "משולב"
  const hasAnyLocation = (data.chainTotals || []).some(c => c.nearestBranch);

  // מיון לפי סורט-מוד. "קרוב" - לפי מרחק; "זול" - לפי מחיר;
  // "משולב" - ציון מנורמל 50/50. אם אין מיקום, "קרוב"/"משולב" נופלים ל-price.
  const sortedChains = (() => {
    const chains = [...(data.chainTotals || [])];
    const fallbackToPrice = (a: PriceChainTotal, b: PriceChainTotal) => {
      if (a.matchedCount === 0 && b.matchedCount > 0) return 1;
      if (b.matchedCount === 0 && a.matchedCount > 0) return -1;
      return a.total - b.total;
    };
    if (sortMode === 'distance' && hasAnyLocation) {
      return chains.sort((a, b) => {
        const aEmpty = a.matchedCount === 0;
        const bEmpty = b.matchedCount === 0;
        if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
        const aDist = a.nearestBranch?.distanceKm ?? Infinity;
        const bDist = b.nearestBranch?.distanceKm ?? Infinity;
        return aDist - bDist;
      });
    }
    if (sortMode === 'combined' && hasAnyLocation) {
      const withData = chains.filter(c => c.matchedCount > 0 && c.nearestBranch);
      if (withData.length > 0) {
        const prices = withData.map(c => c.total);
        const dists = withData.map(c => c.nearestBranch!.distanceKm);
        const minP = Math.min(...prices), maxP = Math.max(...prices);
        const minD = Math.min(...dists), maxD = Math.max(...dists);
        const rangeP = (maxP - minP) || 1;
        const rangeD = (maxD - minD) || 1;
        const score = (c: PriceChainTotal) => {
          if (c.matchedCount === 0 || !c.nearestBranch) return Infinity;
          return ((c.total - minP) / rangeP) * 0.5 + ((c.nearestBranch.distanceKm - minD) / rangeD) * 0.5;
        };
        return chains.sort((a, b) => score(a) - score(b));
      }
    }
    return chains.sort(fallbackToPrice);
  })();

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  // הזולה לא נפתחת אוטומטית - הלקוח מחליט מתי לחקור פירוט. ההצגה
  // מתחילה במצב "סקירה" של כל הרשתות, וכל אחת נפתחת בלחיצה ידנית.

  return (
    <Box sx={{ animation: `${fadeIn} 0.5s ease 0.45s both`, mb: 2 }}>
      {/* כותרת קומפקטית */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25, px: 0.25 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 800 }}>🛒 השוואת מחירים</Typography>
        <BetaBadge size="sm" />
        <Box sx={{ flex: 1 }} />
        {data.lastUpdatedISO && (
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontWeight: 600 }}>
            עודכן {freshness}
          </Typography>
        )}
      </Box>

      {/* באנר מיקום - רק אם רלוונטי */}
      {onRequestLocation && locationStatus === 'idle' && (
        <Box
          onClick={onRequestLocation}
          sx={{
            mb: 1.25, p: 1.25, borderRadius: '12px',
            display: 'flex', alignItems: 'center', gap: 1,
            bgcolor: isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.07)',
            border: '1.5px dashed rgba(124,58,237,0.35)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            '&:active': { transform: 'scale(0.99)' },
          }}
        >
          <Box sx={{
            width: 36, height: 36, borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(124,58,237,0.15)',
            flexShrink: 0,
          }}>
            <MyLocationIcon sx={{ fontSize: 19, color: '#7C3AED' }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>הפעל מיקום</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.15 }}>
              נראה לך את הסניף הקרוב ביותר לכל רשת
            </Typography>
          </Box>
        </Box>
      )}

      {locationStatus === 'requesting' && (
        <Box sx={{
          mb: 1.25, p: 1.25, borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: 1,
          bgcolor: isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.07)',
        }}>
          <CircularProgress size={18} sx={{ color: '#7C3AED' }} />
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>מאתר מיקום…</Typography>
        </Box>
      )}

      {locationStatus === 'granted' && (
        <Box sx={{
          mb: 1.25, px: 1, py: 0.55, borderRadius: '8px',
          display: 'inline-flex', alignItems: 'center', gap: 0.4,
          bgcolor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)',
        }}>
          <LocationOnIcon sx={{ fontSize: 13, color: '#059669' }} />
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#059669' }}>
            מיקום פעיל
          </Typography>
        </Box>
      )}

      {(locationStatus === 'denied' || locationStatus === 'unavailable' || locationStatus === 'error') && (
        <Box sx={{
          mb: 1.25, p: 0.75, borderRadius: '8px',
          display: 'flex', alignItems: 'center', gap: 0.6,
          bgcolor: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(148,163,184,0.05)',
        }}>
          <LocationOffIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', flex: 1 }}>
            {locationStatus === 'denied' ? 'מיקום לא משותף' : 'מיקום לא זמין'}
          </Typography>
          {locationStatus === 'denied' && onResetLocationDenied && (
            <Link component="button" onClick={onResetLocationDenied} sx={{ fontSize: 10.5, fontWeight: 700, color: '#7C3AED', textDecoration: 'none' }}>
              נסה שוב
            </Link>
          )}
        </Box>
      )}

      {/* HERO - חיסכון כמספר ענק. מוצג רק אם יש לפחות רשת אחת שלמה ויש פער. */}
      {hasChainData && cheapest && (
        <Paper
          elevation={0}
          sx={{
            mb: 1.5, p: 2.25,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #14B8A6 0%, #10B981 50%, #059669 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(16,185,129,0.4)',
          }}
        >
          {/* קישוט רקע - עיגול דהוי */}
          <Box sx={{
            position: 'absolute', top: -40, left: -40,
            width: 160, height: 160, borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.08)',
            pointerEvents: 'none',
          }} />

          <Box sx={{ position: 'relative' }}>
            {savings > 0 ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  <SavingsIcon sx={{ fontSize: 18 }} />
                  <Typography sx={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, opacity: 0.95 }}>
                    תחסוך עד
                  </Typography>
                </Box>
                <Typography sx={{
                  fontSize: 56, fontWeight: 900, lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: -1.5,
                  textShadow: '0 2px 12px rgba(0,0,0,0.15)',
                }}>
                  ₪{savings.toFixed(0)}
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700, opacity: 0.95, mt: 0.75 }}>
                  אם תקנה ב-<Typography component="span" sx={{ fontWeight: 900 }}>{cheapest.chainName}</Typography>
                </Typography>
                <Typography sx={{ fontSize: 11.5, opacity: 0.85, mt: 0.25 }}>
                  סה"כ הסל ₪{cheapest.total.toFixed(0)} · {cheapest.matchedCount} מוצרים
                </Typography>
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  <SavingsIcon sx={{ fontSize: 18 }} />
                  <Typography sx={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, opacity: 0.95 }}>
                    הסל הזול
                  </Typography>
                </Box>
                <Typography sx={{
                  fontSize: 44, fontWeight: 900, lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {cheapest.chainName}
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                  ₪{cheapest.total.toFixed(0)}
                </Typography>
              </>
            )}
          </Box>
        </Paper>
      )}

      {/* מצבים ריקים */}
      {!data.enabled && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>
            ⏳ המאגר עדיין לא נטען. ייבוא ראשוני יתבצע בקרוב.
          </Typography>
        </Paper>
      )}

      {data.enabled && !hasAnyPendingItems && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', bgcolor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.06)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: 32, mb: 0.5 }}>🛒</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
            אין כרגע פריטים שטרם נקנו ברשימות שלך.<br/>
            הוסף מוצרים כדי לראות השוואה.
          </Typography>
        </Paper>
      )}

      {data.enabled && hasAnyPendingItems && !hasChainData && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>
            לא הצלחנו לזהות אף אחד מהמוצרים שלך במאגר. נסה שמות מדויקים יותר (לדוגמה: "חלב תנובה 3%" במקום "חלב").
          </Typography>
        </Paper>
      )}

      {/* בר מיון - תמיד גלוי. "קרוב"/"משולב" מעומעמים בלי מיקום */}
      {data.enabled && hasAnyPendingItems && sortedChains.length > 0 && (() => {
        const SortChip = ({ mode, emoji, label, requiresLoc }: { mode: SortMode; emoji: string; label: string; requiresLoc?: boolean }) => {
          const active = sortMode === mode;
          const disabled = requiresLoc && !hasAnyLocation;
          return (
            <Box
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={() => { if (!disabled) { haptic('light'); setSortMode(mode); } }}
              sx={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4,
                py: 0.7, px: 1, borderRadius: '10px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
                userSelect: 'none', WebkitTapHighlightColor: 'transparent',
                bgcolor: active && !disabled
                  ? (isDark ? 'rgba(20,184,166,0.25)' : 'rgba(20,184,166,0.13)')
                  : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                border: '1.5px solid',
                borderColor: active && !disabled ? '#14B8A6' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                transition: 'all 0.12s',
                '&:active': disabled ? {} : { transform: 'scale(0.98)' },
              }}
            >
              <Box sx={{ fontSize: 13 }}>{emoji}</Box>
              <Typography sx={{
                fontSize: 12, fontWeight: active && !disabled ? 800 : 700,
                color: active && !disabled ? '#14B8A6' : 'text.primary',
              }}>
                {label}
              </Typography>
            </Box>
          );
        };
        return (
          <Box sx={{ mb: 1.25 }}>
            <Box sx={{ display: 'flex', gap: 0.5, px: 0.25 }}>
              <SortChip mode="distance" emoji="📍" label="קרוב" requiresLoc />
              <SortChip mode="price" emoji="💰" label="זול" />
              <SortChip mode="combined" emoji="⚖️" label="משולב" requiresLoc />
            </Box>
            {!hasAnyLocation && (
              <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mt: 0.4, textAlign: 'center', fontStyle: 'italic' }}>
                שתף מיקום כדי למיין לפי קרבה
              </Typography>
            )}
          </Box>
        );
      })()}

      {/* CARDS STACK - כרטיס לכל רשת */}
      {data.enabled && hasAnyPendingItems && sortedChains.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sortedChains.map((chain, idx) => (
            <ChainCard
              key={chain.chainId}
              chain={chain}
              rank={idx + 1}
              isWinner={chain.isCheapest}
              cheapestTotal={cheapest?.total || 0}
              isDark={isDark}
              expanded={expandedId === chain.chainId}
              onToggle={() => toggleExpanded(chain.chainId)}
              onOpenNav={setNavBranch}
            />
          ))}
        </Box>
      )}

      {/* Picker ניווט - Waze / Google Maps / Apple Maps */}
      <NavigationPicker branch={navBranch} isDark={isDark} onClose={() => setNavBranch(null)} />

      {/* FOOTER - מטא קומפקטית */}
      <Box sx={{
        mt: 1.5, pt: 1, px: 0.5,
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5,
      }}>
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>
          מקור:{' '}
          <Link href={data.sourceUrl} target="_blank" rel="noopener" sx={{ color: '#0D9488', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
            {data.sourceName} ↗
          </Link>
        </Typography>
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>·</Typography>
        <Link
          href={`mailto:smartbasket129@gmail.com?subject=${encodeURIComponent('דיווח על מידע שגוי בהשוואת מחירים')}&body=${encodeURIComponent('שלום,\n\nראיתי מידע שנראה לא נכון:\n\n[פרט: רשת, סניף, מחיר]\n\nתודה!')}`}
          sx={{ fontSize: 9.5, fontWeight: 600, color: '#DC2626', textDecoration: 'none' }}
        >
          🚩 דווח
        </Link>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontStyle: 'italic' }}>
          מומלץ לאמת בסניף
        </Typography>
      </Box>
    </Box>
  );
});

PriceComparisonCard.displayName = 'PriceComparisonCard';
