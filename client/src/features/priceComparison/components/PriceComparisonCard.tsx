/**
 * PriceComparisonCard — תצוגה ראשית של השוואת מחירים.
 *
 * גישה חדשה: התמקדות ברשתות (לא ברשימות של המשתמש).
 * המשתמש רואה בבת אחת את כל הרשתות ממוינות מהזולה ליקרה,
 * ולחיצה על כל רשת פותחת את פירוט המוצרים והמחירים שלה.
 */

import { memo } from 'react';
import { Box, Typography, Paper, Link, Button, CircularProgress, keyframes } from '@mui/material';
import UpdateIcon from '@mui/icons-material/Update';
import SavingsIcon from '@mui/icons-material/Savings';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import type { PriceComparisonData } from '../types/priceComparison.types';
import type { LocationStatus } from '../hooks/useUserLocation';
import { BetaBadge } from './BetaBadge';
import { ChainComparisonTable } from './ChainComparisonTable';

const fadeIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`;

interface Props {
  data: PriceComparisonData | null;
  loading?: boolean;
  isDark?: boolean;
  locationStatus?: LocationStatus;
  onRequestLocation?: () => void;
  onResetLocationDenied?: () => void;
}

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

// סיווג טריות הנתונים לצבע: ירוק עד שעה, כתום עד יממה, אדום מעל יממה
const freshnessStatus = (iso: string | null): 'fresh' | 'stale' | 'old' | 'unknown' => {
  if (!iso) return 'unknown';
  const ageH = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (ageH < 1) return 'fresh';
  if (ageH < 24) return 'stale';
  return 'old';
};

export const PriceComparisonCard = memo(({ data, loading, isDark, locationStatus, onRequestLocation, onResetLocationDenied }: Props) => {
  if (loading || !data) return null;

  const freshness = formatRelative(data.lastUpdatedISO);
  const fStatus = freshnessStatus(data.lastUpdatedISO);
  // צבעים לפי סטטוס - ירוק/כתום/אדום, נראה לעין כמו רמזור
  const fColor = fStatus === 'fresh' ? '#059669'
    : fStatus === 'stale' ? '#D97706'
    : fStatus === 'old' ? '#DC2626'
    : '#6B7280';
  const fBg = fStatus === 'fresh' ? (isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)')
    : fStatus === 'stale' ? (isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)')
    : fStatus === 'old' ? (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)')
    : (isDark ? 'rgba(107,114,128,0.15)' : 'rgba(107,114,128,0.08)');
  const hasChainData = data.chainTotals?.some(c => c.matchedCount > 0) ?? false;
  const hasAnyPendingItems = data.totalPending > 0;

  // הזולה ביותר וחיסכון - לתצוגת ה-hero
  const cheapest = data.chainTotals?.find(c => c.isCheapest);
  const completeChains = data.chainTotals?.filter(c => c.isComplete && c.matchedCount > 0) ?? [];
  const maxTotal = completeChains.length > 1
    ? Math.max(...completeChains.map(c => c.total))
    : 0;
  const savings = cheapest && maxTotal > cheapest.total ? maxTotal - cheapest.total : 0;

  return (
    <Paper
      sx={{
        p: 2, borderRadius: '18px', mb: 2,
        border: '1px solid',
        borderColor: isDark ? 'rgba(20,184,166,0.2)' : 'rgba(20,184,166,0.15)',
        background: isDark
          ? 'linear-gradient(135deg, rgba(20,184,166,0.1), rgba(20,184,166,0.02) 60%)'
          : 'linear-gradient(135deg, rgba(20,184,166,0.06), rgba(20,184,166,0.01) 60%)',
        animation: `${fadeIn} 0.5s ease 0.45s both`,
      }}
      elevation={0}
    >
      {/* כותרת + מטא-מידע בשורה אחת. ההסבר הארוך הוסר - האייקון של הסל
          המנצח (ירוק במרכז המסך) כבר מספר את הסיפור בלי טקסט מלל. */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>🛒 השוואת מחירים</Typography>
        <BetaBadge size="sm" />
        {data.lastUpdatedISO && (
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.4,
            ml: 'auto', px: 0.85, py: 0.3, borderRadius: '999px',
            bgcolor: fBg, color: fColor,
            border: '1px solid', borderColor: `${fColor}33`,
          }}>
            <UpdateIcon sx={{ fontSize: 12 }} />
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.2 }}>
              עודכן {freshness}
            </Typography>
          </Box>
        )}
      </Box>

      {/* באנר ידידותי - גרסה ראשונית, עם קישור ישיר לדיווח. צבעים נעימים (טורקיז) במקום אזהרה אגרסיבית. */}
      <Box sx={{
        mb: 1.5, px: 1.25, py: 0.85, borderRadius: '10px',
        bgcolor: isDark ? 'rgba(20,184,166,0.1)' : 'rgba(20,184,166,0.07)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(20,184,166,0.3)' : 'rgba(20,184,166,0.22)',
        display: 'flex', alignItems: 'flex-start', gap: 0.85,
      }}>
        <Typography sx={{ fontSize: 15, lineHeight: 1, mt: 0.1, flexShrink: 0 }}>💬</Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: isDark ? '#5EEAD4' : '#0F766E', lineHeight: 1.3 }}>
            מידע ראשוני · עוזרים לנו להשתפר
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.45, mt: 0.25 }}>
            הנתונים מתעדכנים אוטומטית מהפורטל הממשלתי ועדיין נמצאים בשיפור. אם נתקלתם במידע לא תואם —{' '}
            <Link
              href="mailto:smartbasket129@gmail.com?subject=Smart Basket — דיווח על מידע לא תואם בהשוואת מחירים&body=שלום,%0D%0A%0D%0Aנתקלתי בפרט הבא שלא תואם את המציאות:%0D%0A(תארו את הבעיה — שם מוצר, רשת, סניף, מחיר וכו')%0D%0A%0D%0Aתודה!"
              sx={{ color: '#0D9488', fontWeight: 800, textDecoration: 'underline' }}
            >
              דווחו לנו במייל
            </Link>
            .
          </Typography>
        </Box>
      </Box>

      {/* ===== באנר מיקום ===== */}
      {/* מופיע רק בטאב מחירים. מעודד הפעלת מיקום כדי להציג סניף קרוב לכל רשת.
          אחרי אישור - הופך לתג קטן "📍 מיקום פעיל". אחרי דחייה - לינק קטן
          "הפעל ידנית" למי שרוצה לשנות החלטה. */}
      {onRequestLocation && (
        <>
          {locationStatus === 'idle' && (
            <Box sx={{
              mb: 1.25, p: 1.25, borderRadius: '12px',
              display: 'flex', alignItems: 'center', gap: 1,
              bgcolor: isDark ? 'rgba(109,40,217,0.12)' : 'rgba(124,58,237,0.07)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(167,139,250,0.3)' : 'rgba(124,58,237,0.2)',
            }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: isDark ? 'rgba(167,139,250,0.2)' : 'rgba(124,58,237,0.12)',
                flexShrink: 0,
              }}>
                <MyLocationIcon sx={{ fontSize: 19, color: '#7C3AED' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: 'text.primary', lineHeight: 1.3 }}>
                  מצא סניף קרוב אליך
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.35, mt: 0.15 }}>
                  נציג את הסניף הקרוב ואת המרחק לכל רשת
                </Typography>
              </Box>
              <Button
                size="small"
                variant="contained"
                onClick={onRequestLocation}
                sx={{
                  bgcolor: '#7C3AED',
                  '&:hover': { bgcolor: '#6D28D9' },
                  fontSize: 11.5, fontWeight: 800,
                  textTransform: 'none',
                  borderRadius: '8px',
                  px: 1.5,
                  flexShrink: 0,
                }}
              >
                הפעל
              </Button>
            </Box>
          )}

          {locationStatus === 'requesting' && (
            <Box sx={{
              mb: 1.25, p: 1.25, borderRadius: '12px',
              display: 'flex', alignItems: 'center', gap: 1,
              bgcolor: isDark ? 'rgba(109,40,217,0.12)' : 'rgba(124,58,237,0.07)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(167,139,250,0.3)' : 'rgba(124,58,237,0.2)',
            }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: isDark ? 'rgba(167,139,250,0.2)' : 'rgba(124,58,237,0.12)',
                flexShrink: 0,
              }}>
                <CircularProgress size={18} sx={{ color: '#7C3AED' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: 'text.primary', lineHeight: 1.3 }}>
                  מאתר את המיקום שלך
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.15 }}>
                  אם הדפדפן שואל הרשאה — אשר
                </Typography>
              </Box>
            </Box>
          )}

          {locationStatus === 'granted' && (
            <Box sx={{ mb: 1.25, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
              <Box sx={{
                px: 1, py: 0.65, borderRadius: '8px',
                display: 'inline-flex', alignItems: 'center', gap: 0.5, alignSelf: 'flex-start',
                bgcolor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.22)',
              }}>
                <LocationOnIcon sx={{ fontSize: 14, color: '#059669' }} />
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#059669' }}>
                  מיקום פעיל
                </Typography>
              </Box>
            </Box>
          )}

          {(locationStatus === 'denied' || locationStatus === 'unavailable' || locationStatus === 'error') && (
            <Box sx={{
              mb: 1.25, p: 1, borderRadius: '10px',
              display: 'flex', alignItems: 'center', gap: 0.75,
              bgcolor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.06)',
            }}>
              <LocationOffIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary', flex: 1, lineHeight: 1.4 }}>
                {locationStatus === 'denied'
                  ? 'הגישה למיקום נדחתה. אפשר לשנות בהגדרות הדפדפן.'
                  : locationStatus === 'unavailable'
                    ? 'הדפדפן לא תומך בשיתוף מיקום.'
                    : 'לא הצלחנו לקבל את המיקום.'}
              </Typography>
              {locationStatus === 'denied' && onResetLocationDenied && (
                <Link
                  component="button"
                  onClick={onResetLocationDenied}
                  sx={{
                    fontSize: 10.5, fontWeight: 700, color: '#7C3AED',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                    flexShrink: 0,
                  }}
                >
                  נסה שוב
                </Link>
              )}
            </Box>
          )}
        </>
      )}

      {/* מצבים ריקים */}
      {!data.enabled && (
        <Box sx={{
          p: 1.5, borderRadius: '12px',
          bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <Typography sx={{ fontSize: 12.5, color: 'text.primary', lineHeight: 1.6 }}>
            ⏳ המאגר עדיין לא נטען. ייבוא ראשוני יתבצע בקרוב.
          </Typography>
        </Box>
      )}

      {data.enabled && !hasAnyPendingItems && (
        <Box sx={{
          p: 1.5, borderRadius: '12px',
          bgcolor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.06)',
        }}>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6 }}>
            אין כרגע פריטים שטרם נקנו ברשימות שלך. הוסף מוצרים כדי לראות השוואה.
          </Typography>
        </Box>
      )}

      {data.enabled && hasAnyPendingItems && !hasChainData && (
        <Box sx={{
          p: 1.5, borderRadius: '12px',
          bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <Typography sx={{ fontSize: 12.5, color: 'text.primary', lineHeight: 1.6 }}>
            לא הצלחנו לזהות אף אחד מהמוצרים שלך במאגר. נסה שמות מדויקים יותר (למשל "חלב תנובה 3%" במקום "חלב").
          </Typography>
        </Box>
      )}

      {/* Hero: הזולה ביותר + חיסכון - מוצג רק אם יש לפחות רשת שלמה אחת */}
      {hasChainData && cheapest && (
        <Box sx={{
          mb: 1.25, p: 1.75, borderRadius: '14px',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
          color: 'white',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.18)',
            }}>
              <SavingsIcon sx={{ fontSize: 24, color: 'white' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, opacity: 0.9, letterSpacing: 0.5 }}>
                הסל הזול ביותר
              </Typography>
              <Typography sx={{ fontSize: 17, fontWeight: 900, lineHeight: 1.2, mt: 0.15 }}>
                {cheapest.chainName}
              </Typography>
              <Typography sx={{ fontSize: 11, opacity: 0.85, mt: 0.2 }}>
                {cheapest.matchedCount} מוצרים זוהו
                {savings > 0 && ` · חיסכון ₪${savings.toFixed(0)} לעומת היקר ביותר`}
              </Typography>
            </Box>
            <Typography sx={{
              fontSize: 26, fontWeight: 900,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}>
              ₪{cheapest.total.toFixed(0)}
            </Typography>
          </Box>
        </Box>
      )}

      {/* הטבלה המרכזית - כל הרשתות, כולל אלה בלי התאמות */}
      {data.enabled && hasAnyPendingItems && data.chainTotals && data.chainTotals.length > 0 && (
        <ChainComparisonTable chainTotals={data.chainTotals} lastUpdatedISO={data.lastUpdatedISO} />
      )}

      {/* Footer */}
      <Box sx={{
        mt: 1.5, pt: 1.25,
        borderTop: '1px dashed',
        borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }}>
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', lineHeight: 1.5 }}>
          מחירים מתעדכנים אוטומטית. מומלץ לאמת בסניף לפני קנייה.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
          <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>
            מקור:{' '}
            <Link href={data.sourceUrl} target="_blank" rel="noopener" sx={{ color: '#0D9488', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              {data.sourceName} ↗
            </Link>
          </Typography>
          <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>·</Typography>
          {/* קישור דיווח על מידע שגוי - חשוב לבטא ללקוח */}
          <Link
            href={`mailto:smartbasket129@gmail.com?subject=${encodeURIComponent('דיווח על מידע שגוי בהשוואת מחירים')}&body=${encodeURIComponent('שלום,\n\nראיתי מידע שנראה לא נכון בהשוואת המחירים:\n\n[פרט: איזו רשת? איזה סניף? איזה מחיר?]\n\nתודה!')}`}
            sx={{
              fontSize: 9.5, fontWeight: 700, color: '#DC2626',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            🚩 דווח על מידע שגוי
          </Link>
        </Box>
      </Box>
    </Paper>
  );
});

PriceComparisonCard.displayName = 'PriceComparisonCard';
