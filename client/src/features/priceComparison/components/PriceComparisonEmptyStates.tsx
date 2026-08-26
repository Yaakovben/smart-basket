import { Typography, Paper } from '@mui/material';
import { useSettings } from '../../../global/context/SettingsContext';

interface PriceComparisonEmptyStatesProps {
  enabled: boolean;
  hasAnyPendingItems: boolean;
  hasChainData: boolean;
  selectedListName?: string | null;
  isDark: boolean;
}

// מצבים ריקים - המאגר עדיין לא נטען / אין פריטים שטרם נקנו / אין התאמות במאגר
export const PriceComparisonEmptyStates = ({ enabled, hasAnyPendingItems, hasChainData, selectedListName, isDark }: PriceComparisonEmptyStatesProps) => {
  const { t } = useSettings();
  return (
  <>
    {!enabled && (
      <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>
          {t('dbNotLoadedYet')}
        </Typography>
      </Paper>
    )}

    {enabled && !hasAnyPendingItems && (
      <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', bgcolor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.06)', textAlign: 'center' }}>
        <Typography sx={{ fontSize: 32, mb: 0.5 }}>🛒</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
          {selectedListName
            ? <>{t('noPendingItemsInList').replace('{name}', selectedListName)}<br/>{t('addProductsToListHint')}</>
            : <>{t('noPendingItemsAtAll')}<br/>{t('addProductsHint')}</>}
        </Typography>
      </Paper>
    )}

    {enabled && hasAnyPendingItems && !hasChainData && (
      <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>
          {selectedListName
            ? t('noMatchInListHint').replace('{name}', selectedListName)
            : t('noMatchAnyHint')}
        </Typography>
      </Paper>
    )}
  </>
  );
};
