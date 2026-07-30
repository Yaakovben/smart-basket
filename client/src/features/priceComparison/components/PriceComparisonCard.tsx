/**
 * PriceComparisonCard — עיצוב מחדש (mobile-first).
 *
 * 3 שכבות בלבד:
 *  1. Hero - חיסכון ברור מאוד + הרשת הזולה
 *  2. Cards stack - כרטיס לכל רשת, ממוין מהזול ליקר, לחיצה פותחת פירוט inline
 *  3. Footer chip - מטא: עדכון אחרון, מקור, דיווח
 *
 * אין טבלאות, אין modals. כל אינטראקציה inline.
 * כפתור מפה 🗺️ בכותרת פותח BranchMap עם מרקרי סניפים.
 */

import { memo, useState, useCallback } from 'react';
import { Box, Typography, keyframes, IconButton, Tooltip } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import type { PriceComparisonData, NearestBranch } from '../types/priceComparison.types';
import type { LocationStatus, UserLocation } from '../hooks/useUserLocation';
import { useSettings } from '../../../global/context/SettingsContext';
import { getRelativeTime } from '../../../global/helpers/dateFormatting';
import { BetaBadge } from './BetaBadge';
import { NavigationPicker } from './NavigationPicker';
import { ChainCard } from './ChainCard';
import { ChainSortBar } from './ChainSortBar';
import { LocationStatusBanner } from './LocationStatusBanner';
import { SavingsHero } from './SavingsHero';
import { PriceComparisonEmptyStates } from './PriceComparisonEmptyStates';
import { PriceComparisonFooter } from './PriceComparisonFooter';
import { BranchMap } from './BranchMap';
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
  userLocation?: UserLocation | null;
  onRequestLocation?: () => void;
  onResetLocationDenied?: () => void;
  selectedListName?: string | null;
}

export const PriceComparisonCard = memo(({ data, loading, isDark = false, locationStatus, userLocation, onRequestLocation, selectedListName }: Props) => {
  const { settings } = useSettings();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const [navBranch, setNavBranch] = useState<NearestBranch | null>(null);
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
  const hasAnyLocation = hasAnyChainLocation(data.chainTotals);
  const sortedChains = getSortedChains(data.chainTotals, sortMode, hasAnyLocation);
  const cheapestPriceMap = buildCheapestPriceMap(data.chainTotals);

  // סניפים שיש להם קואורדינטות - לכפתור המפה
  const hasBranchesForMap = data.chainTotals?.some(c => c.nearestBranch?.lat) ?? false;

  // מיקום משתמש להצגה ב-BranchMap
  const userLocLat = userLocation?.lat;
  const userLocLng = userLocation?.lng;

  return (
    <Box sx={{ animation: `${fadeIn} 0.5s ease 0.45s both`, mb: 2 }}>
      {/* כותרת קומפקטית + כפתור מפה */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25, px: 0.25 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 800 }}>🛒 השוואת מחירים</Typography>
        <BetaBadge size="sm" />
        <Box sx={{ flex: 1 }} />
        {data.lastUpdatedISO && (
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontWeight: 600 }}>
            עודכן {freshness}
          </Typography>
        )}
        {/* כפתור מפה - מופיע רק כשיש סניפים להציג */}
        {hasBranchesForMap && (
          <Tooltip title={mapOpen ? 'סגור מפה' : 'מפת סניפים'} placement="left">
            <IconButton
              onClick={() => setMapOpen(v => !v)}
              size="small"
              sx={{
                width: 32, height: 32,
                // כשמפה פתוחה - נראה active (צבע מלא)
                bgcolor: mapOpen
                  ? '#0D9488'
                  : (isDark ? 'rgba(20,184,166,0.15)' : 'rgba(20,184,166,0.1)'),
                color: mapOpen ? 'white' : '#0D9488',
                borderRadius: '10px',
                border: `1px solid ${mapOpen ? '#0D9488' : 'rgba(20,184,166,0.3)'}`,
                transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                boxShadow: mapOpen ? '0 2px 8px rgba(13,148,136,0.4)' : 'none',
                '&:hover': {
                  bgcolor: mapOpen
                    ? '#0F766E'
                    : (isDark ? 'rgba(20,184,166,0.25)' : 'rgba(20,184,166,0.18)'),
                },
                '&:active': { transform: 'scale(0.93)' },
              }}
              aria-label={mapOpen ? 'סגור מפת סניפים' : 'פתח מפת סניפים'}
              aria-pressed={mapOpen}
            >
              <MapIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* באנר מיקום */}
      <LocationStatusBanner locationStatus={locationStatus} onRequestLocation={onRequestLocation} isDark={isDark} />

      {/* HERO */}
      {hasChainData && cheapest && <SavingsHero cheapest={cheapest} savings={savings} />}

      {/* מצבים ריקים */}
      <PriceComparisonEmptyStates
        enabled={data.enabled}
        hasAnyPendingItems={hasAnyPendingItems}
        hasChainData={hasChainData}
        selectedListName={selectedListName}
        isDark={isDark}
      />

      {/* בר מיון */}
      {data.enabled && hasAnyPendingItems && sortedChains.length > 0 && (
        <ChainSortBar sortMode={sortMode} setSortMode={setSortMode} hasAnyLocation={hasAnyLocation} isDark={isDark} />
      )}

      {/* CARDS STACK */}
      {data.enabled && hasAnyPendingItems && sortedChains.length > 0 && (() => {
        const winnerColor = { main: '#10B981', bgLight: 'rgba(16,185,129,0.12)', bgDark: 'rgba(16,185,129,0.20)', borderLight: 'rgba(16,185,129,0.45)', borderDark: 'rgba(16,185,129,0.5)' };
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sortedChains.map((chain, idx) => (
              <ChainCard
                key={chain.chainId}
                chain={chain}
                rank={idx + 1}
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

      {/* Picker ניווט */}
      <NavigationPicker branch={navBranch} isDark={isDark} onClose={() => setNavBranch(null)} />

      {/* מפת סניפים */}
      <BranchMap
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        chainTotals={data.chainTotals || []}
        userLat={userLocLat}
        userLng={userLocLng}
      />

      {/* FOOTER */}
      <PriceComparisonFooter sourceUrl={data.sourceUrl} sourceName={data.sourceName} />
    </Box>
  );
});

PriceComparisonCard.displayName = 'PriceComparisonCard';
