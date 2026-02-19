import { memo, useRef, useCallback } from 'react';
import { Box, Typography, TextField, Button, Select, MenuItem, Alert, FormControl, Chip } from '@mui/material';
import type { Product, ProductUnit, ProductCategory } from '../../../global/types';
import { haptic, CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, SIZES, formatDateShort, formatTimeShort } from '../../../global/helpers';
import { Modal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import type { NewProductForm } from '../types/list-types';

// ===== סגנונות =====
const labelSx = {
  fontSize: SIZES.text.md - 1,
  fontWeight: 600,
  color: 'text.secondary',
  mb: 1
};

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

// ===== מודאל הוספת מוצר =====
interface AddProductModalProps {
  isOpen: boolean;
  newProduct: NewProductForm;
  error: string;
  onClose: () => void;
  onAdd: () => void;
  onUpdateField: <K extends keyof NewProductForm>(field: K, value: NewProductForm[K]) => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

export const AddProductModal = memo(({
  isOpen,
  newProduct,
  error,
  onClose,
  onAdd,
  onUpdateField,
  onIncrement,
  onDecrement
}: AddProductModalProps) => {
  const { t } = useSettings();
  const quantityRef = useRef<HTMLInputElement>(null);

  const isNameValid = newProduct.name.trim().length >= 2;

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
      // סגירת מקלדת בשדה האחרון
      (e.target as HTMLInputElement).blur();
      // אם תקין, שליחה
      if (isNameValid) {
        haptic('medium');
        onAdd();
      }
    }
  }, [isNameValid, onAdd]);

  if (!isOpen) return null;

  return (
    <Modal title={t('newProduct')} onClose={onClose}>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} role="alert">
          {error}
        </Alert>
      )}
      <Box sx={{ mb: 2 }}>
        <Typography component="label" htmlFor="product-name" sx={labelSx}>{t('name')}</Typography>
        <TextField
          id="product-name"
          fullWidth
          value={newProduct.name}
          onChange={e => onUpdateField('name', e.target.value)}
          onKeyDown={handleNameKeyDown}
          placeholder={t('productName')}
          aria-required="true"
          inputProps={{
            enterKeyHint: 'next',
            maxLength: 100
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography component="label" htmlFor="product-quantity" sx={labelSx}>{t('quantity')}</Typography>
          <Box sx={quantityBoxSx}>
            <Button
              onClick={onDecrement}
              sx={quantityBtnSx}
              aria-label="−"
            >
              −
            </Button>
            <input
              ref={quantityRef}
              id="product-quantity"
              type="number"
              min="1"
              enterKeyHint="done"
              style={{ flex: 1, border: 'none', textAlign: 'center', fontSize: 20, fontWeight: 600, outline: 'none', width: 50, background: 'transparent' }}
              value={newProduct.quantity}
              onChange={e => onUpdateField('quantity', Math.max(1, parseInt(e.target.value) || 1))}
              onKeyDown={handleQuantityKeyDown}
              aria-label={t('quantity')}
            />
            <Button
              onClick={onIncrement}
              sx={quantityBtnSx}
              aria-label="+"
            >
              +
            </Button>
          </Box>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography component="label" htmlFor="product-unit" sx={labelSx}>{t('unit')}</Typography>
          <FormControl fullWidth>
            <Select
              id="product-unit"
              value={newProduct.unit}
              onChange={e => onUpdateField('unit', e.target.value as ProductUnit)}
              sx={{ height: 52 }}
              aria-label={t('unit')}
            >
              <MenuItem value="יח׳">{t('unitPiece')}</MenuItem>
              <MenuItem value="ק״ג">{t('unitKg')}</MenuItem>
              <MenuItem value="גרם">{t('unitGram')}</MenuItem>
              <MenuItem value="ליטר">{t('unitLiter')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography component="label" htmlFor="product-category" sx={labelSx}>{t('category')}</Typography>
        <FormControl fullWidth>
          <Select
            id="product-category"
            value={newProduct.category}
            onChange={e => onUpdateField('category', e.target.value as ProductCategory)}
            aria-label={t('category')}
          >
            {Object.keys(CATEGORY_ICONS).map(c => (
              <MenuItem key={c} value={c}>{t(CATEGORY_TRANSLATION_KEYS[c as ProductCategory])}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Button
        variant="contained"
        fullWidth
        onClick={() => { haptic('medium'); onAdd(); }}
        disabled={!isNameValid}
        aria-label={t('add')}
      >
        {t('add')}
      </Button>
    </Modal>
  );
});

AddProductModal.displayName = 'AddProductModal';

// ===== מודאל עריכת מוצר =====
interface EditProductModalProps {
  product: Product | null;
  hasChanges: boolean;
  onClose: () => void;
  onSave: () => void;
  onUpdateField: <K extends keyof Product>(field: K, value: Product[K]) => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

export const EditProductModal = memo(({
  product,
  hasChanges,
  onClose,
  onSave,
  onUpdateField,
  onIncrement,
  onDecrement
}: EditProductModalProps) => {
  const { t } = useSettings();
  const quantityRef = useRef<HTMLInputElement>(null);

  const isNameValid = product ? product.name.trim().length >= 2 : false;
  const canSave = hasChanges && isNameValid;

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
    <Modal title={t('editProduct')} onClose={onClose}>
      <Box sx={{ mb: 2 }}>
        <Typography component="label" htmlFor="edit-product-name" sx={labelSx}>{t('name')}</Typography>
        <TextField
          id="edit-product-name"
          fullWidth
          value={product.name}
          onChange={e => onUpdateField('name', e.target.value)}
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
              style={{ flex: 1, border: 'none', textAlign: 'center', fontSize: 20, fontWeight: 600, outline: 'none', width: 50, background: 'transparent' }}
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
      <Box sx={{ mb: 2 }}>
        <Typography sx={labelSx}>{t('category')}</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }} role="radiogroup" aria-label={t('category')}>
          {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
            <Chip
              key={cat}
              label={`${icon} ${t(CATEGORY_TRANSLATION_KEYS[cat as ProductCategory])}`}
              onClick={() => onUpdateField('category', cat as ProductCategory)}
              variant={product.category === cat ? 'filled' : 'outlined'}
              color={product.category === cat ? 'primary' : 'default'}
              sx={{ cursor: 'pointer' }}
              role="radio"
              aria-checked={product.category === cat}
            />
          ))}
        </Box>
      </Box>
      <Button variant="contained" fullWidth onClick={onSave} disabled={!canSave}>{t('save')}</Button>
    </Modal>
  );
});

EditProductModal.displayName = 'EditProductModal';

// ===== מודאל פרטי מוצר =====
interface ProductDetailsModalProps {
  product: Product | null;
  currentUserName: string;
  onClose: () => void;
}

export const ProductDetailsModal = memo(({
  product,
  currentUserName,
  onClose
}: ProductDetailsModalProps) => {
  const { t, settings } = useSettings();

  if (!product) return null;

  const detailRows = [
    { label: t('category'), value: t(CATEGORY_TRANSLATION_KEYS[product.category]) },
    { label: t('addedBy'), value: product.addedBy === currentUserName ? t('you') : product.addedBy, highlight: product.addedBy === currentUserName },
    { label: t('date'), value: product.createdAt ? formatDateShort(product.createdAt, settings.language) : '-' },
    { label: t('time'), value: product.createdAt ? formatTimeShort(product.createdAt, settings.language) : '-' }
  ];

  return (
    <Modal title={t('productDetails')} onClose={onClose}>
      <Box sx={{ textAlign: 'center', mb: 2.5 }}>
        <Box sx={{
          width: 72,
          height: 72,
          borderRadius: '18px',
          bgcolor: 'rgba(20, 184, 166, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 1.5,
          boxShadow: '0 4px 12px rgba(20, 184, 166, 0.15)'
        }}>
          <Typography sx={{ fontSize: 36 }} role="img" aria-label={product.category}>
            {CATEGORY_ICONS[product.category]}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
          {product.name}
        </Typography>
        <Typography sx={{ fontSize: 15, color: 'primary.main', fontWeight: 600 }}>
          {product.quantity} {product.unit}
        </Typography>
      </Box>
      <Box sx={{ bgcolor: 'background.default', borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
        {detailRows.map((row, index) => (
          <Box
            key={row.label}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: '12px 16px',
              borderBottom: index < detailRows.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider'
            }}
          >
            <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{row.label}</Typography>
            <Typography sx={{ fontWeight: 600, fontSize: 14, color: row.highlight ? 'primary.main' : 'text.primary' }}>
              {row.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Modal>
  );
});

ProductDetailsModal.displayName = 'ProductDetailsModal';
