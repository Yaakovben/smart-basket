import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import { Modal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';

// ===== כרטיס אפשרות ניקוי =====
const clearCardSx = (rgb: string) => ({
  display: 'flex', alignItems: 'center', gap: 2,
  p: 2, borderRadius: '14px',
  border: '1.5px solid',
  borderColor: `rgba(${rgb},0.2)`,
  bgcolor: `rgba(${rgb},0.04)`,
  cursor: 'pointer',
  transition: 'all 0.15s',
  '&:active': { transform: 'scale(0.98)', bgcolor: `rgba(${rgb},0.08)` }
});

const clearIconSx = (rgb: string) => ({
  width: 44, height: 44, borderRadius: '12px',
  bgcolor: `rgba(${rgb},0.1)`,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
});

const CLEAR_OPTIONS = [
  { filter: 'all' as const, rgb: '239,68,68', hex: '#EF4444', Icon: DeleteSweepIcon, label: 'clearAll' as const, desc: 'clearAllDesc' as const },
  { filter: 'purchased' as const, rgb: '34,197,94', hex: '#22C55E', Icon: CheckCircleOutlineIcon, label: 'clearPurchased' as const, desc: 'clearPurchasedDesc' as const },
  { filter: 'pending' as const, rgb: '245,158,11', hex: '#F59E0B', Icon: RemoveShoppingCartIcon, label: 'clearPending' as const, desc: 'clearPendingDesc' as const },
] as const;

// ===== מודאל בחירת אפשרות ניקוי רשימה =====
interface ClearListModalProps {
  pendingCount: number;
  purchasedCount: number;
  onClear: (filter: 'all' | 'purchased' | 'pending') => void;
  onClose: () => void;
}

export const ClearListModal = memo(({ pendingCount, purchasedCount, onClear, onClose }: ClearListModalProps) => {
  const { t } = useSettings();
  const counts = { all: pendingCount + purchasedCount, purchased: purchasedCount, pending: pendingCount };

  return (
    <Modal title={t('clearList')} onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {CLEAR_OPTIONS.map(({ filter, rgb, hex, Icon, label, desc }) =>
          counts[filter] > 0 && (
            <Box key={filter} onClick={() => onClear(filter)} sx={clearCardSx(rgb)}>
              <Box sx={clearIconSx(rgb)}>
                <Icon sx={{ color: hex, fontSize: 24 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: hex }}>
                  {t(label)}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                  {t(desc)} ({counts[filter]})
                </Typography>
              </Box>
            </Box>
          )
        )}
      </Box>
    </Modal>
  );
});
ClearListModal.displayName = 'ClearListModal';
