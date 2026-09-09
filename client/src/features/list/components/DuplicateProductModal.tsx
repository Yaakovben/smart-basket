import { memo, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import type { Product, ProductCategory } from '../../../global/types';
import { Modal, ProgressiveImage } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../../../global/helpers';
import { cldThumb, cldBlur } from '../../../global/helpers/cloudinaryImage';

// ===== דיאלוג "מוצר כבר קיים" - מוצג כשמנסים להוסיף מוצר שכבר ברשימה =====
interface DuplicateProductModalProps {
  duplicateProduct: { existing: Product; newData: { name: string; quantity: number; unit: Product['unit']; category: Product['category'] } };
  onIncreaseQuantity: () => void;
  onAddNew: () => void;
  onCancel: () => void;
}

export const DuplicateProductModal = memo(({ duplicateProduct, onIncreaseQuantity, onAddNew, onCancel }: DuplicateProductModalProps) => {
  const { t } = useSettings();
  const existing = duplicateProduct.existing;
  const [imageFailed, setImageFailed] = useState(false);
  const icon = CATEGORY_ICONS[existing.category as ProductCategory] || '📦';
  const color = CATEGORY_COLORS[existing.category as keyof typeof CATEGORY_COLORS] || '#6B7280';

  return (
    <Modal title={t('productExists')} onClose={onCancel}>
      <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', mb: 1.5, lineHeight: 1.6 }}>
        {t('productExistsMessage')
          .replace('{name}', existing.name)
          .replace('{quantity}', String(existing.quantity))
          .replace('{unit}', existing.unit)}
      </Typography>

      {/* כרטיס המוצר הקיים - כדי שיהיה ברור *איזה* מוצר עומדים להגדיל */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        p: 1.25, mb: 2, borderRadius: '14px',
        bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider',
      }}>
        {existing.image && !imageFailed ? (
          <Box sx={{ width: 44, height: 44, borderRadius: '12px', overflow: 'hidden', flexShrink: 0, bgcolor: 'action.selected', position: 'relative' }}>
            <ProgressiveImage
              src={cldThumb(existing.image)}
              blurSrc={cldBlur(existing.image)}
              alt=""
              onError={() => setImageFailed(true)}
            />
          </Box>
        ) : (
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            bgcolor: `${color}22`,
          }}>
            {icon}
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {existing.name}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
            {existing.quantity} {existing.unit}
          </Typography>
        </Box>
      </Box>

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
