import { Typography, Paper, Button, Box } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
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
        <Box sx={{ mt: 1.5 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
            sx={{ borderRadius: '10px', fontSize: 12, borderColor: 'rgba(245,158,11,0.4)', color: 'warning.main', '&:hover': { borderColor: 'rgba(245,158,11,0.7)', bgcolor: 'rgba(245,158,11,0.06)' } }}
          >
            {t('retry')}
          </Button>
        </Box>
      </Paper>
    )}

    {enabled && !hasAnyPendingItems && (
      <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', bgcolor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.06)', textAlign: 'center' }}>
        <Typography sx={{ fontSize: 32, mb: 0.5 }}>🛒</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
          {selectedListName
            ? <>{t('noPendingItemsInList')} <strong>{selectedListName}</strong><br/>{t('addProductsToListHint')}</>
            : <>{t('noPendingItemsAtAll')}<br/>{t('addProductsHint')}</>}
        </Typography>
      </Paper>
    )}

    {enabled && hasAnyPendingItems && !hasChainData && (
      <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>
          {selectedListName
            ? <>{t('noMatchInListHint')} <strong>{selectedListName}</strong></>
            : t('noMatchAnyHint')}
        </Typography>
      </Paper>
    )}
  </>
  );
};
