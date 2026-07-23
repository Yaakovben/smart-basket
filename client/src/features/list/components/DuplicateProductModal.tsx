import { memo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import type { Product } from '../../../global/types';
import { Modal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';

// ===== דיאלוג "מוצר כבר קיים" - מוצג כשמנסים להוסיף מוצר שכבר ברשימה =====
interface DuplicateProductModalProps {
  duplicateProduct: { existing: Product; newData: { name: string; quantity: number; unit: Product['unit']; category: Product['category'] } };
  onIncreaseQuantity: () => void;
  onAddNew: () => void;
  onCancel: () => void;
}

export const DuplicateProductModal = memo(({ duplicateProduct, onIncreaseQuantity, onAddNew, onCancel }: DuplicateProductModalProps) => {
  const { t } = useSettings();

  return (
    <Modal title={t('productExists')} onClose={onCancel}>
      <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', mb: 2.5, lineHeight: 1.6 }}>
        {t('productExistsMessage')
          .replace('{name}', duplicateProduct.existing.name)
          .replace('{quantity}', String(duplicateProduct.existing.quantity))
          .replace('{unit}', duplicateProduct.existing.unit)}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button variant="contained" fullWidth onClick={onIncreaseQuantity} sx={{ py: 1.25 }}>
          {t('increaseQuantity')}
        </Button>
        <Button variant="outlined" fullWidth onClick={onAddNew} sx={{ py: 1.25 }}>
          {t('addAnyway')}
        </Button>
      </Box>
    </Modal>
  );
});
DuplicateProductModal.displayName = 'DuplicateProductModal';
