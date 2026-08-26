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

import { memo, useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import type { PriceComparisonData, NearestBranch } from '../types/priceComparison.types';
import type { LocationStatus } from '../hooks/useUserLocation';
import { useSettings } from '../../../global/context/SettingsContext';
import { getRelativeTime } from '../../../global/helpers/dateFormatting';
import { BetaBadge } from './BetaBadge';
import { NavigationPicker } from './NavigationPicker';
// טעינה עצלה: leaflet/react-leaflet הן ספריות כבדות שלא צריכות להיכנס
// ל-chunk של השוואת המחירים לפני שמישהו בפועל פותח את המפה. prefetch
// ב-useEffect למטה דואג שה-chunk כבר יהיה בקאש עד שהמשתמש בפועל ילחץ.
const BranchesMapDialog = lazy(() => import('./BranchesMapDialog').then(m => ({ default: m.BranchesMapDialog })));
import { ChainCard } from './ChainCard';
import { ChainSortBar } from './ChainSortBar';
import { LocationStatusBanner } from './LocationStatusBanner';
import { SavingsHero } from './SavingsHero';
import { PriceComparisonEmptyStates } from './PriceComparisonEmptyStates';
import { PriceComparisonFooter } from './PriceComparisonFooter';
import {
  type SortMode,
  getCheapestChain,
  getSavings,
  hasAnyChainLocation,
  getSortedChains,
  buildCheapestPriceMap,
} from '../helpers/priceComparisonCardHelpers';

const fadeIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`;

interface Props {
  data: PriceComparisonData | null;
  loading?: boolean;
  isDark?: boolean;
  locationStatus?: LocationStatus;
  onRequestLocation?: () => void;
  onResetLocationDenied?: () => void;
  // שם הרשימה שנבחרה - להתאמת הודעות ריק ("ברשימה הזאת" במקום "ברשימות שלך")
  selectedListName?: string | null;
}

export const PriceComparisonCard = memo(({ data, loading, isDark = false, locationStatus, onRequestLocation, selectedListName }: Props) => {
  const { settings, t } = useSettings();
  // הזולה לא נפתחת אוטומטית - הלקוח מחליט מתי לחקור
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // מצב מיון - ברירת המחדל "קרוב" (נופל ל-price אם אין מיקום)
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  // ה-branch שנבחר לפתיחת picker ניווט (Waze/Google/Apple)
  const [navBranch, setNavBranch] = useState<NearestBranch | null>(null);
  // מפת כל הסניפים (Leaflet/OSM חינמי) - נפתחת במסך מלא, כפתור בבר המיון
  const [mapOpen, setMapOpen] = useState(false);
  const toggleExpanded = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  // חימום מקדים של ה-chunk של המפה ברגע שהכרטיס עולה - לא ממתינים ללחיצה
  // על "הצג על מפה". עד שהמשתמש בפועל ילחץ, ה-JS כבר בקאש והמפה נפתחת
  // כמעט מיידית במקום לחכות להורדת רשת (אותו דפוס כמו QRScanner).
  useEffect(() => {
    import('./BranchesMapDialog');
  }, []);

  if (loading || !data) return null;

  const freshness = data.lastUpdatedISO ? getRelativeTime(data.lastUpdatedISO, settings.language) : null;
  const hasChainData = data.chainTotals?.some(c => c.matchedCount > 0) ?? false;
  const hasAnyPendingItems = data.totalPending > 0;

  const cheapest = getCheapestChain(data.chainTotals);
  const savings = getSavings(data.chainTotals, cheapest);
  // האם יש מיקום לפחות לרשת אחת - מאפשר מיון "קרוב" / "משולב"
  const hasAnyLocation = hasAnyChainLocation(data.chainTotals);
  const sortedChains = getSortedChains(data.chainTotals, sortMode, hasAnyLocation);
  const cheapestPriceMap = buildCheapestPriceMap(data.chainTotals);

  // הזולה לא נפתחת אוטומטית - הלקוח מחליט מתי לחקור פירוט. ההצגה
  // מתחילה במצב "סקירה" של כל הרשתות, וכל אחת נפתחת בלחיצה ידנית.

  return (
    <Box sx={{ animation: `${fadeIn} 0.5s ease 0.45s both`, mb: 2 }}>
      {/* כותרת קומפקטית */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25, px: 0.25 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{t('priceComparisonTitle')}</Typography>
        <BetaBadge size="sm" />
        <Box sx={{ flex: 1 }} />
        {data.lastUpdatedISO && (
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontWeight: 600 }}>
            {t('priceComparisonUpdated').replace('{time}', freshness || '')}
          </Typography>
        )}
      </Box>

      {/* באנר מיקום - רק אם רלוונטי */}
      <LocationStatusBanner locationStatus={locationStatus} onRequestLocation={onRequestLocation} isDark={isDark} />

      {/* HERO - חיסכון מובלט אבל לא צועק */}
      {hasChainData && cheapest && <SavingsHero cheapest={cheapest} savings={savings} />}

      {/* מצבים ריקים */}
      <PriceComparisonEmptyStates
        enabled={data.enabled}
        hasAnyPendingItems={hasAnyPendingItems}
        hasChainData={hasChainData}
        selectedListName={selectedListName}
        isDark={isDark}
      />

      {/* בר מיון - תמיד גלוי. "קרוב"/"משולב" מעומעמים בלי מיקום */}
      {data.enabled && hasAnyPendingItems && sortedChains.length > 0 && (
        <ChainSortBar sortMode={sortMode} setSortMode={setSortMode} hasAnyLocation={hasAnyLocation} isDark={isDark} onOpenMap={() => setMapOpen(true)} />
      )}

      {/* CARDS STACK - כרטיס לכל רשת. ההדגשה ברקע אוטומטית על המוביל לפי המיון. */}
      {data.enabled && hasAnyPendingItems && sortedChains.length > 0 && (() => {
        // צבע אחיד למנצח בכל מצב מיון - ירוק "זול" של האפליקציה
        const winnerColor = { main: '#10B981', bgLight: 'rgba(16,185,129,0.12)', bgDark: 'rgba(16,185,129,0.20)', borderLight: 'rgba(16,185,129,0.45)', borderDark: 'rgba(16,185,129,0.5)' };
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sortedChains.map((chain, idx) => (
              <ChainCard
                key={chain.chainId}
                chain={chain}
                rank={idx + 1}
                // המנצח = השורה הראשונה בסדר הנוכחי (תקף לכל מצב מיון).
                // ככה תמיד יש הדגשה ויזואלית בראש - זול / קרוב / משולב.
                isWinner={idx === 0 && chain.matchedCount > 0}
                cheapestTotal={cheapest?.total || 0}
                isDark={isDark}
                expanded={expandedId === chain.chainId}
                onToggle={() => toggleExpanded(chain.chainId)}
                onOpenNav={setNavBranch}
                hasLocation={locationStatus === 'granted'}
                winnerColor={winnerColor}
                cheapestPriceMap={cheapestPriceMap}
              />
            ))}
          </Box>
        );
      })()}

      {/* Picker ניווט - Waze / Google Maps / Apple Maps */}
      <NavigationPicker branch={navBranch} isDark={isDark} onClose={() => setNavBranch(null)} />

      {/* מפת סניפים במסך מלא - Leaflet + OpenStreetMap, חינמי לגמרי.
          מסך מלא ולא Modal-גיליון קטן, כדי שהמפה תקבל מספיק מקום אמיתי. */}
      {mapOpen && (
        <Suspense fallback={null}>
          <BranchesMapDialog isDark={isDark} onClose={() => setMapOpen(false)} />
        </Suspense>
      )}

      {/* FOOTER - מטא קומפקטית */}
      <PriceComparisonFooter sourceUrl={data.sourceUrl} sourceName={data.sourceName} />
    </Box>
  );
});

PriceComparisonCard.displayName = 'PriceComparisonCard';
