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
import { Box, Typography, CircularProgress, keyframes } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { PriceComparisonData, NearestBranch, PriceChainTotal, PriceMatch } from '../types/priceComparison.types';
import type { LocationStatus } from '../hooks/useUserLocation';
import { useSettings } from '../../../global/context/SettingsContext';
import { getRelativeTime } from '../../../global/helpers/dateFormatting';
import { BetaBadge } from './BetaBadge';
import { PriceComparisonHelpModal } from './PriceComparisonHelpModal';
import { NavigationPicker } from './NavigationPicker';
import { ChainBranchPicker } from './ChainBranchPicker';
import { ProductMatchPicker } from './ProductMatchPicker';
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
  getSplitSavings,
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
  hasLocation?: boolean;
  onRequestLocation?: () => void;
  onResetLocationDenied?: () => void;
  // שם הרשימה שנבחרה - להתאמת הודעות ריק ("ברשימה הזאת" במקום "ברשימות שלך")
  selectedListName?: string | null;
  // מיקום המשתמש - לחישוב מרחקים בבורר הסניפים
  userLocation?: { lat: number; lng: number } | null;
  // סניפים שנבחרו ידנית (chainId -> storeId) ופעולת הבחירה. storeId=null מבטל בחירה.
  chosenBranches?: Record<string, string>;
  onChooseBranch?: (chainId: string, storeId: string | null) => void;
  // נקרא אחרי תיקון התאמה - מרענן את ההשוואה
  onMatchChanged?: () => void;
  // true כשמתבצע רענון ברקע (למשל אחרי החלפת סניף) על נתונים שכבר מוצגים.
  // מדמם את הכרטיסים במקום להחליף מספרים בפתאומיות בלי שום סימן טעינה.
  isRefreshing?: boolean;
}

export const PriceComparisonCard = memo(({ data, loading, isDark = false, locationStatus, hasLocation = false, onRequestLocation, selectedListName, userLocation, chosenBranches, onChooseBranch, onMatchChanged, isRefreshing = false }: Props) => {
  const { settings, t } = useSettings();
  // הזולה לא נפתחת אוטומטית - הלקוח מחליט מתי לחקור
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // מצב מיון - ברירת המחדל "זול": הכרטיס הראשון והמסומן הוא הזול באמת. במיון
  // "קרוב" ההדגשה הירוקה נפלה על הסניף הקרוב גם כשהוא היקר.
  const [sortMode, setSortMode] = useState<SortMode>('price');
  // ה-branch שנבחר לפתיחת picker ניווט (Waze/Google/Apple)
  const [navBranch, setNavBranch] = useState<NearestBranch | null>(null);
  // מפת כל הסניפים (Leaflet/OSM חינמי) - נפתחת במסך מלא, כפתור בבר המיון
  const [mapOpen, setMapOpen] = useState(false);
  // הרשת שעבורה פתוח בורר הסניפים (null = סגור)
  const [pickerChain, setPickerChain] = useState<{ chainId: string; chainName: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  // המוצר שההתאמה שלו מתוקנת כרגע (null = סגור)
  const [fixMatch, setFixMatch] = useState<PriceMatch | null>(null);
  const openBranchPicker = useCallback((c: PriceChainTotal) => {
    setPickerChain({ chainId: c.chainId, chainName: c.chainName });
  }, []);
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
  const splitSavings = getSplitSavings(cheapest, cheapestPriceMap);

  // הזולה לא נפתחת אוטומטית - הלקוח מחליט מתי לחקור פירוט. ההצגה
  // מתחילה במצב "סקירה" של כל הרשתות, וכל אחת נפתחת בלחיצה ידנית.

  return (
    <Box sx={{ animation: `${fadeIn} 0.5s ease 0.45s both`, mb: 2 }}>
      {/* כותרת קומפקטית */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.35, px: 0.25 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{t('priceComparisonTitle')}</Typography>
        <BetaBadge size="sm" />
        <Box sx={{ flex: 1 }} />
        {data.lastUpdatedISO && (
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontWeight: 600 }}>
            {t('priceComparisonUpdated').replace('{time}', freshness || '')}
          </Typography>
        )}
      </Box>

      {/* שורת עזרה עדינה - לא צועקת, רק זמינה למי שמתעניין איך לבחור סניף/לתקן התאמה */}
      <Box sx={{ mb: 1.25, px: 0.25 }}>
        <Box
          component="button"
          onClick={() => setShowHelp(true)}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.4,
            background: 'none', border: 'none', p: 0, cursor: 'pointer',
            color: 'text.disabled', '&:hover': { color: '#0D9488' },
          }}
          aria-label={t('priceHelpTitle')}
          title={t('priceHelpTitle')}
        >
          <HelpOutlineIcon sx={{ fontSize: 13 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'inherit' }}>
            {t('priceHelpTitle')}
          </Typography>
        </Box>
      </Box>

      {/* באנר מיקום - רק אם רלוונטי */}
      <LocationStatusBanner locationStatus={locationStatus} hasLocation={hasLocation} onRequestLocation={onRequestLocation} isDark={isDark} />

      {/* HERO - חיסכון מובלט אבל לא צועק */}
      {hasChainData && cheapest && <SavingsHero cheapest={cheapest} savings={savings} splitSavings={splitSavings} />}

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
          <Box sx={{ position: 'relative' }}>
            {/* מסך רענון עדין - הכרטיסים מתעמעמים ומקבלים ספינר מרכזי, במקום
                שהמספרים יתחלפו פתאום בלי שום רמז שמתבצע חישוב מחדש (למשל
                אחרי החלפת סניף או תיקון התאמה). */}
            {isRefreshing && (
              <Box sx={{
                position: 'absolute', inset: 0, zIndex: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.65)',
                borderRadius: '16px', backdropFilter: 'blur(1.5px)',
                transition: 'opacity 0.2s ease',
              }}>
                <CircularProgress size={26} sx={{ color: '#0D9488' }} />
              </Box>
            )}
            <Box sx={{
              display: 'flex', flexDirection: 'column', gap: 1,
              opacity: isRefreshing ? 0.5 : 1,
              filter: isRefreshing ? 'blur(1px)' : 'none',
              transition: 'opacity 0.2s ease, filter 0.2s ease',
              pointerEvents: isRefreshing ? 'none' : 'auto',
            }}>
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
                  onChangeBranch={openBranchPicker}
                  onFixMatch={setFixMatch}
                  hasLocation={locationStatus === 'granted'}
                  winnerColor={winnerColor}
                  cheapestPriceMap={cheapestPriceMap}
                />
              ))}
            </Box>
          </Box>
        );
      })()}

      {/* Picker ניווט - Waze / Google Maps / Apple Maps */}
      <NavigationPicker branch={navBranch} isDark={isDark} onClose={() => setNavBranch(null)} />

      {/* בורר מוצר - תיקון התאמה שגויה */}
      <ProductMatchPicker
        match={fixMatch}
        onChanged={() => onMatchChanged?.()}
        onClose={() => setFixMatch(null)}
      />

      {/* בורר סניף ידני לרשת */}
      <ChainBranchPicker
        chain={pickerChain}
        location={userLocation}
        selectedStoreId={pickerChain ? chosenBranches?.[pickerChain.chainId] : undefined}
        isDark={isDark}
        onSelect={(chainId, storeId) => { onChooseBranch?.(chainId, storeId); setPickerChain(null); }}
        onClose={() => setPickerChain(null)}
      />

      {/* הסבר עדין - איך לבחור סניף ולתקן התאמת מוצר שגויה */}
      {showHelp && <PriceComparisonHelpModal onClose={() => setShowHelp(false)} isDark={isDark} />}

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
