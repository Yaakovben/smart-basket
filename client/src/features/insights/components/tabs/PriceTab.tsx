import { memo, useEffect, useRef } from 'react';
import { Box, Typography, Button } from '@mui/material';
import type { LocationStatus } from '../../../priceComparison/hooks/useUserLocation';
import { PriceComparisonCard, type PriceComparisonData } from '../../../priceComparison';
import { ShimmerList, TopProgressBar } from '../../../../global/components';
import { haptic } from '../../../../global/helpers';
import { InsightsLoader } from '../InsightsLoader';
import type { InsightsListMeta } from '../../types/insights-types';
import { useSettings } from '../../../../global/context/SettingsContext';

interface PriceTabProps {
  isDark: boolean;
  priceData: PriceComparisonData | null;
  priceLoading: boolean;
  priceLoadingLabel: string;
  priceError: boolean;
  onRetry: () => void;
  locationStatus: LocationStatus;
  hasLocation: boolean;
  userLocation: { lat: number; lng: number } | null;
  chosenBranches: Record<string, string>;
  onChooseBranch: (chainId: string, storeId: string | null) => void;
  onMatchChanged: () => void;
  onRequestLocation: () => void;
  onResetLocationDenied: () => void;
  selectedListId: string | null;
  onSelectListId: (id: string | null) => void;
  allUserLists: InsightsListMeta[];
}

// טאב "מחירים" של עמוד התובנות - השוואת מחירים בין רשתות לרשימה נבחרת.
export const PriceTab = memo(({
  isDark, priceData, priceLoading, priceLoadingLabel, priceError, onRetry,
  locationStatus, hasLocation, userLocation, chosenBranches, onChooseBranch, onMatchChanged, onRequestLocation, onResetLocationDenied,
  selectedListId, onSelectListId, allUserLists,
}: PriceTabProps) => {
  const { t } = useSettings();

  // בורר הרשימות הוא פס אופקי נגלל. אחרי כניסה מ"פירוט מלא בתובנות" של
  // רשימה מסוימת, הצ'יפ שלה עלול להיות מחוץ למסך בפס - ממרכזים אותו לתוך
  // הבורר (scrollLeft של הבורר בלבד, בלי לגעת בגלילה האנכית של העמוד).
  const chipScrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scroller = chipScrollerRef.current;
    if (!scroller) return;
    const key = selectedListId ?? '';
    const chip = scroller.querySelector<HTMLElement>(`[data-list-id="${key}"]`);
    if (!chip) return;
    const sRect = scroller.getBoundingClientRect();
    const cRect = chip.getBoundingClientRect();
    const delta = (cRect.left - sRect.left) - (scroller.clientWidth - cRect.width) / 2;
    if (Math.abs(delta) > 4) scroller.scrollBy({ left: delta, behavior: 'smooth' });
  }, [selectedListId, allUserLists.length, priceData]);

  // הקשר הרשימה נדבק (sticky) לצמיתות בראש הטאב, מעל כל שאר התוכן שגולל
  // מתחתיו - כולל בורר הרשימות עצמו. בעבר הוא התכווץ ונעלם אחרי גלילה
  // קלה (70-160px), אבל זה גרם למשתמש לאבד את ההקשר "על איזו רשימה
  // ההשוואה מתבצעת" ברגע שהוא התחיל לקרוא את התוצאות. עכשיו הוא פשוט
  // נשאר צמוד למעלה תמיד (position: sticky), עם צל עדין שמדגיש שהוא
  // צף מעל התוכן ולא חלק ממנו.
  const stickyRef = useRef<HTMLDivElement>(null);
  // צל מופיע רק אחרי שגוללים בפועל - כשהתוכן עדיין בראש אין מה להפריד ממנו.
  const stickyRafRef = useRef<number | null>(null);
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const root = el.closest<HTMLElement>('[data-insights-scroll-root]');
    if (!root) return;
    const paint = (scrollTop: number) => {
      el.style.boxShadow = scrollTop > 4 ? '0 6px 14px -8px rgba(0,0,0,0.35)' : 'none';
    };
    const onScroll = () => {
      if (stickyRafRef.current != null) return;
      stickyRafRef.current = requestAnimationFrame(() => {
        stickyRafRef.current = null;
        paint(root.scrollTop);
      });
    };
    paint(root.scrollTop);
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      if (stickyRafRef.current != null) cancelAnimationFrame(stickyRafRef.current);
    };
  }, []);

  if (!priceData) {
    // אין cache - מצב ראשוני. מציגים לודר/שגיאה/ריק בהתאם.
    if (priceError) {
      return (
        <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
          <Box sx={{ fontSize: 48, mb: 1.5 }}>⚠️</Box>
          <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>{t('priceLoadErrorTitle')}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>{t('priceLoadErrorDesc')}</Typography>
          <Button
            variant="contained"
            onClick={onRetry}
            sx={{ borderRadius: '12px', px: 3, py: 1, textTransform: 'none', fontWeight: 700 }}
          >
            {t('tryAgain')}
          </Button>
        </Box>
      );
    }
    if (priceLoading) {
      // Shimmer - placeholder אלגנטי שמרמז על מבנה המסך הצפוי
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <ShimmerList count={5} rowHeight={68} gap={10} />
        </Box>
      );
    }
    return <InsightsLoader text={t('noPriceDataNow')} size="md" />;
  }

  return (
    <>
      {/* הקשר הרשימה שעליה מתבצע הניתוח - נדבק (sticky) לצמיתות בראש הטאב,
          מעל כל שאר התוכן (כולל תוכן שגולל מתחתיו), כדי שברור תמיד על
          איזו רשימה מתבצע הניתוח גם תוך כדי קריאת התוצאות. */}
      {allUserLists.length > 0 && (
        <Box
          ref={stickyRef}
          sx={{
            position: 'sticky', top: 0, zIndex: 5,
            bgcolor: 'background.default',
            px: 2, mx: -2, pt: 1, pb: 1, mb: 1.5,
            transition: 'box-shadow 0.2s ease',
          }}
        >
          {/* תווית מידע - מוצגת כשיש רשימה אחת. המשתמש יודע על מה הניתוח נעשה. */}
          {allUserLists.length === 1 && allUserLists[0] && (
            <Box sx={{
              px: 1.25, py: 0.85, borderRadius: '12px',
              display: 'flex', alignItems: 'center', gap: 0.75,
              bgcolor: isDark ? 'rgba(20,184,166,0.1)' : 'rgba(20,184,166,0.06)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(20,184,166,0.25)' : 'rgba(20,184,166,0.18)',
            }}>
              <Box sx={{ fontSize: 16, lineHeight: 1 }}>{allUserLists[0].icon}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 600, lineHeight: 1, mb: 0.2 }}>
                  {t('priceAnalysisOn')}
                </Typography>
                <Typography sx={{
                  fontSize: 12.5, fontWeight: 800, color: '#0D9488', lineHeight: 1.2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {allUserLists[0].name}
                </Typography>
              </Box>
            </Box>
          )}

          {/* בורר רשימה - מוצג רק אם יש 2+ רשימות. פס דק מעל הכותרת ומתחת
              לצ'יפים "מסגרר" את כל האזור כשורה נבחרת אחת - רמז עדין
              שזה בורר, בלי אייקון בולט. */}
          {allUserLists.length > 1 && (
            <Box sx={{
              borderTop: '1px solid', borderBottom: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
              pt: 1, pb: 1.1,
            }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.75, px: 0.5 }}>
                {t('whichListToCompare')}
              </Typography>
              <Box sx={{ position: 'relative' }}>
                <Box ref={chipScrollerRef} sx={{
                  display: 'flex', flexWrap: 'nowrap', gap: 0.75,
                  overflowX: 'auto', WebkitOverflowScrolling: 'touch',
                  '&::-webkit-scrollbar': { display: 'none' },
                }}>
                {/* "כל הרשימות" - אפשרי, אבל לא דיפולט (אפקט auto-select בוחר רשימה ראשונה
                    כדי למנוע עומס בכניסה). המשתמש יכול לבחור 'הכל' באופן יזום. */}
                <Box
                  data-list-id=""
                  onClick={() => { haptic('light'); onSelectListId(null); }}
                  sx={{
                    flexShrink: 0,
                    px: 1.5, py: 0.75,
                    borderRadius: '999px',
                    border: '1.5px solid',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    bgcolor: selectedListId === null
                      ? '#14B8A6'
                      : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(20,184,166,0.04)'),
                    color: selectedListId === null ? 'white' : 'text.primary',
                    borderColor: selectedListId === null
                      ? '#14B8A6'
                      : (isDark ? 'rgba(20,184,166,0.25)' : 'rgba(20,184,166,0.2)'),
                    fontSize: 12, fontWeight: 700,
                    transition: 'all 0.15s',
                    '&:active': { transform: 'scale(0.96)' },
                  }}
                >
                  {t('allListsChip')}
                </Box>
                {allUserLists.map(l => (
                  <Box
                    key={l.id}
                    data-list-id={l.id}
                    onClick={() => { haptic('light'); onSelectListId(l.id); }}
                    sx={{
                      flexShrink: 0,
                      px: 1.5, py: 0.75,
                      borderRadius: '999px',
                      border: '1.5px solid',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      bgcolor: selectedListId === l.id
                        ? '#14B8A6'
                        : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(20,184,166,0.04)'),
                      color: selectedListId === l.id ? 'white' : 'text.primary',
                      borderColor: selectedListId === l.id
                        ? '#14B8A6'
                        : (isDark ? 'rgba(20,184,166,0.25)' : 'rgba(20,184,166,0.2)'),
                      fontSize: 12, fontWeight: 700,
                      transition: 'all 0.15s',
                      maxWidth: 180,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      '&:active': { transform: 'scale(0.96)' },
                    }}
                  >
                    <span>{l.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</span>
                  </Box>
                ))}
                </Box>
                {/* דעיכה עדינה בקצה ימין (התחלת הפס ב-RTL) - רומזת שיש עוד
                    צ'יפים לגלול אליהם, אותו רעיון כמו trailing ב-CategoryFilterChips. */}
                <Box sx={{
                  position: 'absolute', top: 0, bottom: 0, right: 0, width: 20,
                  background: `linear-gradient(to left, ${isDark ? '#111827' : '#F8FAFC'}, transparent)`,
                  pointerEvents: 'none',
                }} />
              </Box>
            </Box>
          )}
        </Box>
      )}
      {/* פס דק עליון - מסמן רענון רקע בלי להפריע לתוכן הקיים */}
      <TopProgressBar active={priceLoading} label={priceLoadingLabel} />
      {/* שגיאה עם cache קיים - באנר אזהרה לא-חוסם.
          קונטרסט הועצם (bg + טקסט כהה יותר) כדי שלא יוסתר בגלילה. */}
      {priceError && !priceLoading && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, py: 0.95, mb: 1, borderRadius: '10px',
          bgcolor: isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.16)',
          border: '1.5px solid', borderColor: isDark ? 'rgba(245,158,11,0.55)' : 'rgba(245,158,11,0.5)',
        }}>
          <Box sx={{ fontSize: 14 }}>⚠️</Box>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: isDark ? '#FCD34D' : '#92400E', flex: 1 }}>
            {t('staleDataWarning')}
          </Typography>
        </Box>
      )}
      <PriceComparisonCard
        data={priceData}
        isDark={isDark}
        locationStatus={locationStatus}
        hasLocation={hasLocation}
        userLocation={userLocation}
        chosenBranches={chosenBranches}
        onChooseBranch={onChooseBranch}
        onMatchChanged={onMatchChanged}
        // priceData כבר קיים כאן (זה הענף אחרי ה-`if (!priceData)` למעלה) - אז
        // priceLoading כאן הוא תמיד רענון ברקע, לא הטעינה הראשונית.
        isRefreshing={priceLoading}
        onRequestLocation={onRequestLocation}
        onResetLocationDenied={onResetLocationDenied}
        selectedListName={
          selectedListId
            ? (allUserLists.find(l => l.id === selectedListId)?.name
                ?? priceData?.lists?.find(l => l.listId === selectedListId)?.listName
                ?? null)
            : null
        }
      />
    </>
  );
});
PriceTab.displayName = 'PriceTab';
