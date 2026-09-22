import { memo, useEffect, useRef, useState } from 'react';
import { Box, Typography, Dialog, ButtonBase, TextField, Button, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import type { PriceMatch } from '../types/priceComparison.types';
import { priceComparisonApi, type ProductSearchResult } from '../services/priceComparison.api';
import { useSettings } from '../../../global/context/SettingsContext';
import { haptic, formatILS } from '../../../global/helpers';
import { ShimmerList } from '../../../global/components';

const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

interface ProductMatchPickerProps {
  // המוצר שההתאמה שלו מתוקנת. null = הבורר סגור.
  match: PriceMatch | null;
  // נקרא אחרי שמירה או ביטול של תיקון - הקורא מרענן את ההשוואה
  onChanged: () => void;
  onClose: () => void;
}

// בורר מוצר: כשההתאמה האוטומטית טעתה, המשתמש מחפש ובוחר את המוצר הנכון.
// הבחירה נשמרת ומשפיעה על כל הרשתות ועל כל הרשימות שבהן המוצר מופיע.
export const ProductMatchPicker = memo(({ match, onChanged, onClose }: ProductMatchPickerProps) => {
  const { t } = useSettings();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSearchResult[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestId = useRef(0);

  const productName = match?.userProductName;
  // פתיחה על מוצר חדש: מתחילים מהשם שהמשתמש כתב
  useEffect(() => {
    if (productName === undefined) return;
    setQuery(productName);
    setResults(null);
    setFailed(false);
  }, [productName]);

  useEffect(() => {
    if (productName === undefined) return;
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) { setResults([]); return; }
    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      setResults(null);
      priceComparisonApi.searchProducts(q).then(res => {
        // מתעלמים מתשובה של חיפוש ישן שהוחלף בינתיים
        if (id === requestId.current) setResults(res);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, productName]);

  const save = async (choice: { barcode?: string; excluded?: boolean } | 'reset') => {
    if (!match || saving) return;
    haptic('light');
    setSaving(true);
    setFailed(false);
    const ok = choice === 'reset'
      ? await priceComparisonApi.clearMatchOverride(match.userProductName)
      : await priceComparisonApi.setMatchOverride(match.userProductName, choice);
    setSaving(false);
    if (!ok) { setFailed(true); return; }
    onChanged();
    onClose();
  };

  const hasOverride = !!match?.userOverride;

  return (
    <Dialog
      open={!!match}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: '16px', height: '85vh', maxHeight: 620, display: 'flex', flexDirection: 'column' } }}
    >
      <Box sx={{ p: 2, pb: 1, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{t('matchPickerTitle')}</Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>
              {t('matchPickerSubtitle')}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label={t('close')} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
        <TextField
          value={query}
          onChange={e => setQuery(e.target.value)}
          size="small"
          fullWidth
          autoFocus
          placeholder={t('matchPickerSearchPlaceholder')}
          InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, mr: 0.75, color: 'text.disabled' }} /> }}
          sx={{ mt: 1.25 }}
        />
      </Box>

      {/* גובה קבוע (לא minHeight) - כך כשתוצאות החיפוש מגיעות (מ-shimmer
          למספר תוצאות כלשהו) הפופאפ לא "קופץ" בגודל; רק גלילה פנימית. */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {results === null && (
          <Box sx={{ py: 0.5 }}><ShimmerList count={3} rowHeight={54} gap={8} /></Box>
        )}
        {results?.length === 0 && query.trim().length >= MIN_QUERY_LENGTH && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center', py: 2 }}>
            {t('matchPickerNoResults')}
          </Typography>
        )}
        {results?.map(r => {
          const selected = match?.userOverride === 'chosen' && r.barcode === match.barcode;
          return (
            <ButtonBase
              key={r.barcode}
              disabled={saving}
              onClick={() => save({ barcode: r.barcode })}
              sx={{
                justifyContent: 'flex-start', gap: 1, p: 1.25, borderRadius: '10px',
                border: '1px solid', borderColor: selected ? '#0D9488' : 'divider', textAlign: 'start',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{r.itemName}</Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                  {[r.manufacturerName, t('matchPickerInChains').replace('{count}', String(r.chainCount))].filter(Boolean).join(' · ')}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#0F766E', flexShrink: 0 }}>
                {t('matchPickerFrom')} {formatILS(r.minPrice, 2)}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>

      {failed && (
        <Typography sx={{ fontSize: 11.5, color: 'error.main', textAlign: 'center', px: 2, pb: 0.5 }}>
          {t('matchPickerSaveFailed')}
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 1, p: 1.5, pt: 0.75, flexWrap: 'wrap' }}>
        <Button size="small" disabled={saving} onClick={() => save({ excluded: true })} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {t('matchPickerNoneOfThese')}
        </Button>
        {hasOverride && (
          <Button size="small" disabled={saving} onClick={() => save('reset')} sx={{ textTransform: 'none', fontWeight: 700 }}>
            {t('matchPickerReset')}
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={onClose} sx={{ textTransform: 'none' }}>{t('cancel')}</Button>
      </Box>
    </Dialog>
  );
});
ProductMatchPicker.displayName = 'ProductMatchPicker';
