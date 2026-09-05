import { memo, useRef, useCallback } from 'react';
import { Box, Typography, Button, Select, MenuItem, FormControl, CircularProgress } from '@mui/material';
import type { Product, ProductUnit } from '../../../../global/types';
import { haptic, COMMON_STYLES } from '../../../../global/helpers';
import { Modal, ClearableTextField } from '../../../../global/components';
import { useSettings } from '../../../../global/context/SettingsContext';
import { ProductNoteField } from './ProductNoteField';
import { ProductImageField } from './ProductImageField';
import { CategoryGrid } from './CategoryGrid';

// ===== סגנונות =====
const labelSx = COMMON_STYLES.label;

const quantityBoxSx = {
  display: 'flex',
  border: '1.5px solid',
  borderColor: 'divider',
  borderRadius: '12px',
  overflow: 'hidden',
  height: 52
};

const quantityBtnSx = {
  minWidth: 52,
  borderRadius: 0,
  bgcolor: 'action.hover',
  fontSize: 24
};

// ===== מודאל עריכת מוצר =====
interface EditProductModalProps {
  product: Product | null;
  hasChanges: boolean;
  saving?: boolean;
  onClose: () => void;
  onSave: () => void;
  onUpdateField: <K extends keyof Product>(field: K, value: Product[K]) => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

export const EditProductModal = memo(({
  product,
  hasChanges,
  saving = false,
  onClose,
  onSave,
  onUpdateField,
  onIncrement,
  onDecrement
}: EditProductModalProps) => {
  const { t } = useSettings();
  const quantityRef = useRef<HTMLInputElement>(null);

  const isNameValid = product ? product.name.trim().length >= 2 : false;
  const canSave = hasChanges && isNameValid && !saving;

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      quantityRef.current?.focus();
      quantityRef.current?.select();
    }
  }, []);

  const handleQuantityKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
      if (canSave) {
        onSave();
      }
    }
  }, [canSave, onSave]);

  if (!product) return null;

  return (
    <Modal
      title={t('editProduct')}
      onClose={() => !saving && onClose()}
      footer={
        <Button variant="contained" fullWidth onClick={() => { haptic('medium'); onSave(); }} disabled={!canSave}>
          {saving ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('save')}
        </Button>
      }
    >
      <Box sx={{ mb: 2 }}>
        <Typography component="label" htmlFor="edit-product-name" sx={labelSx}>{t('name')}</Typography>
        <ClearableTextField
          autoFocus
          id="edit-product-name"
          fullWidth
          value={product.name}
          onChange={e => onUpdateField('name', e.target.value)}
          onClear={() => onUpdateField('name', '')}
          onKeyDown={handleNameKeyDown}
          aria-required="true"
          inputProps={{
            enterKeyHint: 'next',
            maxLength: 100
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography component="label" htmlFor="edit-product-quantity" sx={labelSx}>{t('quantity')}</Typography>
          <Box sx={quantityBoxSx}>
            <Button onClick={onDecrement} sx={quantityBtnSx} aria-label="−">−</Button>
            <input
              ref={quantityRef}
              id="edit-product-quantity"
              type="number"
              min="1"
              enterKeyHint="done"
              style={{ flex: 1, border: 'none', textAlign: 'center', fontSize: 20, fontWeight: 600, outline: 'none', width: 50, background: 'transparent', color: 'inherit' }}
              value={product.quantity}
              onChange={e => onUpdateField('quantity', Math.max(1, parseInt(e.target.value) || 1))}
              onKeyDown={handleQuantityKeyDown}
              aria-label={t('quantity')}
            />
            <Button onClick={onIncrement} sx={quantityBtnSx} aria-label="+">+</Button>
          </Box>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography component="label" htmlFor="edit-product-unit" sx={labelSx}>{t('unit')}</Typography>
          <FormControl fullWidth>
            <Select
              id="edit-product-unit"
              value={product.unit}
              onChange={e => onUpdateField('unit', e.target.value as ProductUnit)}
              sx={{ height: 52 }}
            >
              <MenuItem value="יח׳">{t('unitPiece')}</MenuItem>
              <MenuItem value="ק״ג">{t('unitKg')}</MenuItem>
              <MenuItem value="גרם">{t('unitGram')}</MenuItem>
              <MenuItem value="ליטר">{t('unitLiter')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      {/* "הוסף הערה" ו"הוסף תמונה" - שתי עמודות קבועות (grid, לא flex-wrap):
          לכל אחד חצי מהרוחב תמיד, כולל כשהוא פתוח/יש בו תמונה. בעבר עם
          flexBasis:100% כשנפתח, פתיחת ההערה דחפה את התמונה לשורה חדשה
          במקום לשבת לצידה. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
        <ProductNoteField
          value={product.note || ''}
          onChange={(v) => onUpdateField('note', v as Product['note'])}
        />
        <ProductImageField
          value={product.image || ''}
          onChange={(v) => onUpdateField('image', v as Product['image'])}
        />
      </Box>
      <Box sx={{ mb: 0.5 }}>
        <Typography sx={labelSx}>{t('category')}</Typography>
        <CategoryGrid
          selected={product.category}
          onSelect={(cat) => { haptic('light'); onUpdateField('category', cat); }}
        />
      </Box>
    </Modal>
  );
});

EditProductModal.displayName = 'EditProductModal';
