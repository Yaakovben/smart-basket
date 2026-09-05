import { memo } from 'react';
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
  onRequestLocation: () => void;
  onResetLocationDenied: () => void;
  selectedListId: string | null;
  onSelectListId: (id: string | null) => void;
  allUserLists: InsightsListMeta[];
}

// טאב "מחירים" של עמוד התובנות - השוואת מחירים בין רשתות לרשימה נבחרת.
export const PriceTab = memo(({
  isDark, priceData, priceLoading, priceLoadingLabel, priceError, onRetry,
  locationStatus, onRequestLocation, onResetLocationDenied,
  selectedListId, onSelectListId, allUserLists,
}: PriceTabProps) => {
  const { t } = useSettings();
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
      {/* הקשר הרשימה שעליה מתבצע הניתוח - נדבק לראש העמוד בזמן גלילה כך
          שתמיד ברור על מה ההשוואה נעשית, גם כשגוללים עמוק לתוך התוצאות
          (למשל אחרי כניסה ישירה לתובנות מתוך רשימה מסוימת). רקע אטום +
          zIndex כדי שהתוכן שנגלל מתחת לא יציץ דרכו. */}
      {allUserLists.length > 0 && (
        <Box id="insights-price-list-context" sx={{
          position: 'sticky',
          top: 'env(safe-area-inset-top, 0px)',
          zIndex: 5,
          bgcolor: 'background.default',
          mx: -2, px: 2, pt: 1, pb: 1,
          borderBottom: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }}>
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

          {/* בורר רשימה - מוצג רק אם יש 2+ רשימות */}
          {allUserLists.length > 1 && (
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.75, px: 0.5 }}>
                {t('whichListToCompare')}
              </Typography>
              <Box sx={{
                display: 'flex', flexWrap: 'nowrap', gap: 0.75,
                overflowX: 'auto', WebkitOverflowScrolling: 'touch',
                '&::-webkit-scrollbar': { display: 'none' },
              }}>
                {/* "כל הרשימות" - אפשרי, אבל לא דיפולט (אפקט auto-select בוחר רשימה ראשונה
                    כדי למנוע עומס בכניסה). המשתמש יכול לבחור 'הכל' באופן יזום. */}
                <Box
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
