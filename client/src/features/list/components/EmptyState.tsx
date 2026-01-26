import { memo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { haptic } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import type { ListFilter } from '../types/list-types';

// ===== Props =====
interface EmptyStateProps {
  filter: ListFilter;
  totalProducts: number;
  onAddProduct: () => void;
}

// ===== Component =====
export const EmptyState = memo(({ filter, totalProducts, onAddProduct }: EmptyStateProps) => {
  const { t } = useSettings();
  // Show "all done" only if there are products and we're on pending tab
  const isAllDone = filter === 'pending' && totalProducts > 0;

  return (
    <Box sx={{
      textAlign: 'center',
      p: { xs: 4, sm: 5 },
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '40vh'
    }}>
      <Box
        sx={{
          width: { xs: 80, sm: 100 },
          height: { xs: 80, sm: 100 },
          borderRadius: '50%',
          background: isAllDone ? 'linear-gradient(135deg, #CCFBF1, #99F6E4)' : 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: { xs: 2, sm: 2.5 },
          fontSize: { xs: 44, sm: 56 }
        }}
        role="img"
        aria-label={isAllDone ? t('allDone') : t('noProducts')}
      >
        {isAllDone ? '🎉' : '📦'}
      </Box>
      <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 600, color: 'text.secondary', mb: 1 }}>
        {isAllDone ? t('allDone') : t('noProducts')}
      </Typography>
      <Typography sx={{ fontSize: { xs: 13, sm: 14 }, color: 'text.secondary', mb: { xs: 2.5, sm: 3 } }}>
        {isAllDone ? t('allDoneDesc') : t('noProductsDesc')}
      </Typography>
      {!isAllDone && (
        <Button
          variant="contained"
          onClick={() => { haptic('light'); onAddProduct(); }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: { xs: 2.5, sm: 3 },
            py: { xs: 1.25, sm: 1.5 },
            fontSize: { xs: 14, sm: 15 }
          }}
          aria-label={t('addProduct')}
        >
          <AddIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
          <span>{t('addProduct')}</span>
        </Button>
      )}
    </Box>
  );
});

EmptyState.displayName = 'EmptyState';
