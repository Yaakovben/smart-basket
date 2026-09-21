import { memo, useEffect, useState } from 'react';
import { Box, Typography, Dialog, CircularProgress, ButtonBase } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import NearMeIcon from '@mui/icons-material/NearMe';
import CheckIcon from '@mui/icons-material/Check';
import type { ChainBranchOption } from '../types/priceComparison.types';
import { priceComparisonApi, type UserLocation } from '../services/priceComparison.api';
import { useSettings } from '../../../global/context/SettingsContext';
import { haptic } from '../../../global/helpers';

interface ChainBranchPickerProps {
  // הרשת לבחירת סניף. null = הבורר סגור.
  chain: { chainId: string; chainName: string } | null;
  // מיקום המשתמש - לחישוב מרחק ומיון. אופציונלי.
  location?: UserLocation | null;
  // storeId הנבחר כרגע ידנית לרשת (אם יש)
  selectedStoreId?: string;
  isDark: boolean;
  // storeId נבחר, או null = חזרה לסניף הקרוב אליי
  onSelect: (chainId: string, storeId: string | null) => void;
  onClose: () => void;
}

// בורר סניף לרשת: המשתמש בוחר בעצמו את הסניף שלפיו יחושבו המחירים.
export const ChainBranchPicker = memo(({ chain, location, selectedStoreId, isDark, onSelect, onClose }: ChainBranchPickerProps) => {
  const { t } = useSettings();
  const [branches, setBranches] = useState<ChainBranchOption[] | null>(null);

  const chainId = chain?.chainId;
  useEffect(() => {
    if (!chainId) return;
    let cancelled = false;
    // איפוס בפתיחת בורר חדש כדי לא להבהב רשימה של רשת קודמת
    setBranches(null);
    priceComparisonApi.getChainBranches(chainId, location ?? undefined).then(res => {
      if (!cancelled) setBranches(res);
    });
    return () => { cancelled = true; };
  }, [chainId, location]);

  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  return (
    <Dialog
      open={!!chain}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: '16px', maxHeight: '80vh' } }}
    >
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>
          {t('chooseBranchTitle').replace('{chain}', chain?.chainName ?? '')}
        </Typography>
      </Box>

      <Box sx={{ overflowY: 'auto', px: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {chain && (
          <ButtonBase
            onClick={() => { haptic('light'); onSelect(chain.chainId, null); }}
            sx={{
              justifyContent: 'flex-start', gap: 1, p: 1.25, borderRadius: '10px',
              border: '1px solid', borderColor: !selectedStoreId ? '#0D9488' : border,
              textAlign: 'start',
            }}
          >
            <NearMeIcon sx={{ fontSize: 18, color: '#0D9488' }} />
            <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{t('useNearestBranch')}</Typography>
            {!selectedStoreId && <CheckIcon sx={{ fontSize: 18, color: '#0D9488' }} />}
          </ButtonBase>
        )}

        {branches === null && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
        )}

        {branches?.length === 0 && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center', py: 2 }}>
            {t('noBranchesFound')}
          </Typography>
        )}

        {branches?.map(b => {
          const selected = b.storeId === selectedStoreId;
          return (
            <ButtonBase
              key={b.storeId}
              onClick={() => { haptic('light'); if (chain) onSelect(chain.chainId, b.storeId); }}
              sx={{
                justifyContent: 'flex-start', gap: 1, p: 1.25, borderRadius: '10px',
                border: '1px solid', borderColor: selected ? '#0D9488' : border,
                textAlign: 'start', opacity: b.hasPriceData ? 1 : 0.6,
              }}
            >
              <StorefrontIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.branchName}
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[b.address, b.city].filter(Boolean).join(', ')}
                  {typeof b.distanceKm === 'number' ? ` · ${t('chainDistanceKm').replace('{km}', b.distanceKm.toFixed(1))}` : ''}
                </Typography>
                {!b.hasPriceData && (
                  <Typography sx={{ fontSize: 10, color: 'warning.main' }}>{t('branchHasNoPriceData')}</Typography>
                )}
              </Box>
              {selected && <CheckIcon sx={{ fontSize: 18, color: '#0D9488' }} />}
            </ButtonBase>
          );
        })}
      </Box>
    </Dialog>
  );
});
ChainBranchPicker.displayName = 'ChainBranchPicker';
