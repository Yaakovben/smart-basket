import { memo, useCallback } from 'react';
import { Box, Typography, Collapse, keyframes } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NearMeIcon from '@mui/icons-material/NearMe';
import type { PriceChainTotal, NearestBranch } from '../types/priceComparison.types';
import { RankBadge } from './RankBadge';
import { ChainCardDetails } from './ChainCardDetails';
import { haptic } from '../../../global/helpers';

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
  // האם המשתמש שיתף מיקום פעיל. רק אז הגיוני להציג "אין סניף במאגר"
  // - לפני אישור מיקום אין סיבה לטעון שהסניף "חסר", פשוט עוד לא נשאלנו.
  hasLocation: boolean;
  // צבע ההדגשה לפי מצב המיון - ירוק/תכלת/סגול
  winnerColor: { main: string; bgLight: string; bgDark: string; borderLight: string; borderDark: string };
  // מיפוי cheapestPrice לכל מוצר - לחוויית "הכי זול" per-product
  cheapestPriceMap?: Map<string, { cheapest: number; mostExpensive: number }>;
}

export const ChainCard = memo(({ chain, rank, isWinner, cheapestTotal, isDark, expanded, onToggle, onOpenNav, hasLocation, winnerColor, cheapestPriceMap }: ChainCardProps) => {
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
        position: 'relative',
        transition: 'border-color 0.15s, transform 0.1s',
        '&:active': { transform: 'scale(0.99)' },
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
                  זוהו{' '}
                  <Typography component="span" sx={{
                    fontSize: 11, fontWeight: 800,
                    color: chain.isComplete ? '#059669' : '#D97706',
                  }}>
                    {chain.matchedCount}
                  </Typography>
                  {' '}מתוך{' '}
                  <Typography component="span" sx={{ fontSize: 11, fontWeight: 700 }}>
                    {total}
                  </Typography>
                  {' '}מוצרים
                </Typography>
              );
            })() : (
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                {chain.hasData ? 'אין התאמות' : 'לא פורסם'}
              </Typography>
            )}
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
                        ? 'אין לנו מיקום מדויק - המרחק לא ידוע. ניתן לנווט לפי הכתובת'
                        : chain.nearestBranch.isApproximate
                          ? 'מרחק משוער לפי מרכז העיר - הכתובת לא נמצאה במפה'
                          : undefined
                    }
                  >
                    {typeof chain.nearestBranch.distanceKm === 'number'
                      ? `${chain.nearestBranch.isApproximate ? '~' : ''}${chain.nearestBranch.distanceKm.toFixed(1)} ק"מ`
                      : 'מיקום לא מדויק'}
                  </Typography>
                </Box>
              </>
            ) : hasMatches && hasLocation && (
              // אין סניף עם קואורדינטות במאגר OSM - מוצג רק כשהמיקום פעיל,
              // אחרת אין סיבה לטעון שהסניף "חסר" - פשוט המשתמש לא שיתף מיקום עדיין.
              <>
                <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>·</Typography>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', fontStyle: 'italic' }}>
                  אין סניף במאגר
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
        <ChainCardDetails chain={chain} isDark={isDark} hasMatches={hasMatches} onNavigate={handleNavigate} cheapestPriceMap={cheapestPriceMap} />
      </Collapse>
    </Box>
  );
});
ChainCard.displayName = 'ChainCard';
