import { memo, useCallback } from 'react';
import { Box, Typography, Collapse, keyframes } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NearMeIcon from '@mui/icons-material/NearMe';
import type { PriceChainTotal, PriceMatch, NearestBranch } from '../types/priceComparison.types';
import { RankBadge } from './RankBadge';
import { ChainCardDetails } from './ChainCardDetails';
import { daysSince, STALE_CHAIN_DAYS, type ProductPriceRange } from '../helpers/priceComparisonCardHelpers';
import { haptic, formatILS } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';

// אנימציה עדינה לכרטיס הראשון - בצבע טורקיז ניטרלי שמתאים לכל סוג מיון
// (זול/קרוב/משולב). נמנע מירוק שיוצר רושם "זול" כששורת הרצועה אומרת משהו אחר.
const shineGlow = keyframes`
  0%, 100% { box-shadow: 0 3px 10px rgba(20,184,166,0.18); }
  50% { box-shadow: 0 4px 14px rgba(20,184,166,0.28); }
`;

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
  // פותח את בורר הסניפים של הרשת
  onChangeBranch: (chain: PriceChainTotal) => void;
  // פותח את בורר המוצר לתיקון התאמה שגויה
  onFixMatch: (match: PriceMatch) => void;
  // האם המשתמש שיתף מיקום פעיל. רק אז הגיוני להציג "אין סניף במאגר"
  // - לפני אישור מיקום אין סיבה לטעון שהסניף "חסר", פשוט עוד לא נשאלנו.
  hasLocation: boolean;
  // צבע ההדגשה לפי מצב המיון - ירוק/תכלת/סגול
  winnerColor: { main: string; bgLight: string; bgDark: string; borderLight: string; borderDark: string };
  // מיפוי cheapestPrice לכל מוצר - לחוויית "הכי זול" per-product
  cheapestPriceMap?: Map<string, ProductPriceRange>;
}

export const ChainCard = memo(({ chain, rank, isWinner, cheapestTotal, isDark, expanded, onToggle, onOpenNav, onChangeBranch, onFixMatch, hasLocation, winnerColor, cheapestPriceMap }: ChainCardProps) => {
  const { t } = useSettings();
  const delta = chain.total - cheapestTotal;
  const hasMatches = chain.matchedCount > 0;

  // רקע ומסגרת המנצח בצבע לפי מצב המיון; אחרת נייטרלי
  const cardBg = isWinner
    ? (isDark ? winnerColor.bgDark : winnerColor.bgLight)
    : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)');
  const cardBorder = isWinner
    ? (isDark ? winnerColor.borderDark : winnerColor.borderLight)
    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)');

  const handleNavigate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!chain.nearestBranch) return;
    // פותח picker עם Waze/Google Maps/Apple Maps - לא יורד ישר ל-Google
    onOpenNav(chain.nearestBranch);
  }, [chain.nearestBranch, onOpenNav]);

  const handleChangeBranch = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeBranch(chain);
  }, [chain, onChangeBranch]);

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={chain.chainName}
      onClick={() => { haptic('light'); onToggle(); }}
      onKeyDown={(e: React.KeyboardEvent) => {
        // Enter/רווח פותחים וסוגרים את הכרטיס, כמו בלחיצה. מתעלמים ממקשים שנוצרו
        // בתוך לחצן פנימי (החלף סניף, תיקון התאמה) כדי לא להפעיל אותם פעמיים.
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic('light'); onToggle(); }
      }}
      sx={{
        borderRadius: '14px',
        background: cardBg,
        border: '1.5px solid',
        borderColor: cardBorder,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 0.15s, transform 0.1s',
        '&:active': { transform: 'scale(0.99)' },
        '&:focus-visible': { outline: '2px solid #0D9488', outlineOffset: 2 },
        // אפקט הילה רק כשהכרטיס באמת המוביל לפי המיון - לא סתם למקום ראשון.
        // במיון מחיר: רק אם isCheapest (יכול להיות שמקום ראשון הוא 'הכי שלם' אבל לא הכי זול).
        // במיון מרחק/משולב: rank 1 מספיק כי המיון הוא לפי המדד.
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
      {/* בלי רצועת עיתונות. במקום זה, הכרטיס הראשון בכל מיון
          מקבל רקע בולט בצבע מתאים (ירוק לזול, סגול לקרוב, טורקיז למשולב). */}
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
            {hasMatches ? (() => {
              // נוסח ברור: "זוהו X מתוך Y" במקום "X מוצרים וחסר Z"
              const total = chain.matchedCount + chain.unmatchedCount;
              return (
                <Typography className="chain-meta" sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {t('matchedLabelPrefix')}{' '}
                  <Typography component="span" sx={{
                    fontSize: 11, fontWeight: 800,
                    color: chain.isComplete ? '#059669' : '#D97706',
                  }}>
                    {chain.matchedCount}
                  </Typography>
                  {' '}{t('matchedLabelMiddle')}{' '}
                  <Typography component="span" sx={{ fontSize: 11, fontWeight: 700 }}>
                    {total}
                  </Typography>
                  {' '}{t('matchedLabelSuffix')}
                </Typography>
              );
            })() : (
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                {chain.hasData ? t('noMatches') : t('notPublished')}
              </Typography>
            )}
            {/* "מחיר מדויק לסניף": כל המוצרים שזוהו תומחרו לפי הסניף הקרוב. לא מציגים
                כשהנתונים ישנים, כדי לא לסתור את אזהרת "נתונים מלפני X ימים" */}
            {chain.nearestBranch && chain.matchedCount > 0 && chain.branchVerifiedCount === chain.matchedCount
              && !(chain.hasData && (daysSince(chain.lastUpdatedISO) ?? 0) >= STALE_CHAIN_DAYS) && (
              <>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>·</Typography>
                <Typography sx={{ fontSize: 10.5, color: '#059669', fontWeight: 700 }}>
                  ✓ {t('branchAllVerified')}
                </Typography>
              </>
            )}
            {(() => {
              // נתוני הרשת ישנים - המחירים עלולים לא לשקף את החנות היום
              const days = chain.hasData ? daysSince(chain.lastUpdatedISO) : undefined;
              return days !== undefined && days >= STALE_CHAIN_DAYS ? (
                <>
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>·</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'warning.main', fontWeight: 700 }}>
                    {t('staleChainData').replace('{days}', String(days))}
                  </Typography>
                </>
              ) : null;
            })()}
            {chain.nearestBranch ? (
              <>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>·</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                  <NearMeIcon sx={{
                    fontSize: 11,
                    color: typeof chain.nearestBranch.distanceKm === 'number' ? 'text.disabled' : 'warning.main',
                  }} />
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      color: typeof chain.nearestBranch.distanceKm === 'number'
                        ? (chain.nearestBranch.isApproximate ? 'warning.main' : 'text.disabled')
                        : 'warning.main',
                      fontWeight: 600,
                    }}
                    title={
                      typeof chain.nearestBranch.distanceKm !== 'number'
                        ? t('noExactLocationHint')
                        : chain.nearestBranch.isApproximate
                          ? t('approxDistanceHint')
                          : undefined
                    }
                  >
                    {typeof chain.nearestBranch.distanceKm === 'number'
                      ? t('chainDistanceKm').replace('{km}', `${chain.nearestBranch.isApproximate ? '~' : ''}${chain.nearestBranch.distanceKm.toFixed(1)}`)
                      : t('locationInaccurate')}
                  </Typography>
                </Box>
              </>
            ) : hasMatches && hasLocation && (
              // אין סניף עם קואורדינטות במאגר OSM - מוצג רק כשהמיקום פעיל,
              // אחרת אין סיבה לטעון שהסניף "חסר" - פשוט המשתמש לא שיתף מיקום עדיין.
              <>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>·</Typography>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', fontStyle: 'italic' }}>
                  {t('noBranchInDatabase')}
                </Typography>
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
                  {formatILS(chain.total)}
                </Typography>
                {!isWinner && delta > 0 && chain.isComplete && (
                  <Typography sx={{ fontSize: 10.5, color: '#DC2626', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    +{formatILS(delta)}
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
        <ChainCardDetails chain={chain} isDark={isDark} hasMatches={hasMatches} onNavigate={handleNavigate} onChangeBranch={handleChangeBranch} onFixMatch={onFixMatch} cheapestPriceMap={cheapestPriceMap} />
      </Collapse>
    </Box>
  );
});
ChainCard.displayName = 'ChainCard';
