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
import { Box, Typography, Button, keyframes } from '@mui/material';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import type { PriceComparisonData, NearestBranch } from '../types/priceComparison.types';
import type { LocationStatus } from '../hooks/useUserLocation';
import { useSettings } from '../../../global/context/SettingsContext';
import { getRelativeTime } from '../../../global/helpers/dateFormatting';
import { Modal } from '../../../global/components';
import { BetaBadge } from './BetaBadge';
import { NavigationPicker } from './NavigationPicker';
import { BranchesMapView } from './BranchesMapView';
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
  const { settings } = useSettings();
  // הזולה לא נפתחת אוטומטית - הלקוח מחליט מתי לחקור
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // מצב מיון - ברירת המחדל "קרוב" (נופל ל-price אם אין מיקום)
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  // ה-branch שנבחר לפתיחת picker ניווט (Waze/Google/Apple)
  const [navBranch, setNavBranch] = useState<NearestBranch | null>(null);
  // מפת כל הסניפים (Leaflet/OSM חינמי) - נפתחת ב-modal בלחיצה על אייקון המפה
  const [mapOpen, setMapOpen] = useState(false);
  const toggleExpanded = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
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

      {/* כפתור מפת סניפים - שורה משלו עם טקסט גלוי (לא רק אייקון) ושטח לחיצה
          נוח (44px), כדי שיהיה קל למצוא ולהפעיל ולא יתחרה על מקום עם "עודכן". */}
      <Button
        onClick={() => setMapOpen(true)}
        aria-label="הצג את כל הסניפים על מפה"
        startIcon={<MapOutlinedIcon sx={{ fontSize: 18 }} />}
        endIcon={<ChevronLeftIcon sx={{ fontSize: 16 }} />}
        fullWidth
        sx={{
          justifyContent: 'space-between',
          minHeight: 44,
          mb: 1.25,
          px: 1.5,
          borderRadius: '12px',
          textTransform: 'none',
          fontSize: 13, fontWeight: 700,
          color: '#0D9488',
          bgcolor: isDark ? 'rgba(20,184,166,0.14)' : 'rgba(20,184,166,0.1)',
          '&:hover': { bgcolor: isDark ? 'rgba(20,184,166,0.22)' : 'rgba(20,184,166,0.18)' },
        }}
      >
        הצג סניפים על מפה
      </Button>

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
        <ChainSortBar sortMode={sortMode} setSortMode={setSortMode} hasAnyLocation={hasAnyLocation} isDark={isDark} />
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
              />
            ))}
          </Box>
        );
      })()}

      {/* Picker ניווט - Waze / Google Maps / Apple Maps */}
      <NavigationPicker branch={navBranch} isDark={isDark} onClose={() => setNavBranch(null)} />

      {/* מודאל מפת סניפים - Leaflet + OpenStreetMap, חינמי לגמרי */}
      {mapOpen && (
        <Modal title="מפת סניפים" onClose={() => setMapOpen(false)}>
          <BranchesMapView isDark={isDark} />
        </Modal>
      )}

      {/* FOOTER - מטא קומפקטית */}
      <PriceComparisonFooter sourceUrl={data.sourceUrl} sourceName={data.sourceName} />
    </Box>
  );
});

PriceComparisonCard.displayName = 'PriceComparisonCard';
