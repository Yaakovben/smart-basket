import { memo, useRef, useCallback, useMemo } from 'react';
import { Box, Typography, TextField, Button, Select, MenuItem, Alert, FormControl } from '@mui/material';
import type { ProductUnit, ProductCategory } from '../../../../global/types';
import { haptic, CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, COMMON_STYLES } from '../../../../global/helpers';
import { detectCategory } from '../../../../global/helpers/categoryDetector';
import { Modal } from '../../../../global/components';
import { useSettings } from '../../../../global/context/SettingsContext';
import type { NewProductForm } from '../../types/list-types';
import { ProductNoteField } from './ProductNoteField';
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

// ===== מודאל הוספת מוצר =====
interface ProductSuggestion {
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
}

interface AddProductModalProps {
  isOpen: boolean;
  newProduct: NewProductForm;
  error: string;
  suggestions?: ProductSuggestion[];
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
  suggestions = [],
  onClose,
  onAdd,
  onUpdateField,
  onIncrement,
  onDecrement
}: AddProductModalProps) => {
  const { t } = useSettings();
  const quantityRef = useRef<HTMLInputElement>(null);

  const isNameValid = newProduct.name.trim().length >= 2;

  // הצעות מוצרים - מסוננות לפי הקלדה
  const filteredSuggestions = useMemo(() => {
    const query = newProduct.name.trim().toLowerCase();
    if (query.length < 2 || !suggestions.length) return [];
    return suggestions
      .filter(s => s.name.toLowerCase().includes(query) && s.name.toLowerCase() !== query)
      .slice(0, 5);
  }, [newProduct.name, suggestions]);

  // הוספו לאחרונה - 4 מוצרים אחרונים מהיסטוריה לכניסה מהירה.
  // מוצג רק כשהשדה ריק (אחרת filteredSuggestions תופס את המקום).
  const recentSuggestions = useMemo(() => {
    if (newProduct.name.trim().length > 0 || !suggestions.length) return [];
    return suggestions.slice(0, 4);
  }, [newProduct.name, suggestions]);

  // זיהוי אוטומטי של קטגוריה בזמן הקלדה
  const detectedCategory = useMemo(() => {
    const name = newProduct.name.trim();
    if (name.length < 2) return null;
    const detected = detectCategory(name);
    return detected !== 'אחר' ? detected : null;
  }, [newProduct.name]);

  // עדכון קטגוריה אוטומטי אם המשתמש לא בחר ידנית
  const userChangedCategory = useRef(false);

  const applySuggestion = useCallback((s: ProductSuggestion) => {
    onUpdateField('name', s.name);
    onUpdateField('category', s.category);
    onUpdateField('unit', s.unit);
    userChangedCategory.current = true;
    haptic('light');
  }, [onUpdateField]);

  const handleNameChange = useCallback((value: string) => {
    onUpdateField('name', value);
    if (!userChangedCategory.current) {
      const detected = detectCategory(value.trim());
      if (detected !== 'אחר') {
        onUpdateField('category', detected as ProductCategory);
      }
    }
  }, [onUpdateField]);

  const handleCategoryClick = useCallback((cat: ProductCategory) => {
    haptic('light');
    userChangedCategory.current = true;
    onUpdateField('category', cat);
  }, [onUpdateField]);

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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography component="label" htmlFor="product-name" sx={labelSx}>{t('name')}</Typography>
          {detectedCategory && (
            <Typography sx={{ fontSize: 11, color: 'primary.main', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {CATEGORY_ICONS[detectedCategory as ProductCategory]} {t(CATEGORY_TRANSLATION_KEYS[detectedCategory as ProductCategory])}
            </Typography>
          )}
        </Box>
        <TextField
          autoFocus
          id="product-name"
          fullWidth
          value={newProduct.name}
          onChange={e => handleNameChange(e.target.value)}
          onKeyDown={handleNameKeyDown}
          placeholder={t('productName')}
          aria-required="true"
          inputProps={{
            enterKeyHint: 'next',
            maxLength: 100
          }}
        />
        {/* הוספו לאחרונה - chips של מוצרים מההיסטוריה לכניסה מהירה.
            רק כשהשדה ריק - אחרת filteredSuggestions תופס את המקום. */}
        {recentSuggestions.length > 0 && (
          <Box sx={{ mt: 0.75 }}>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontWeight: 700, letterSpacing: 0.3, mb: 0.5, px: 0.25 }}>
              ⏱️ הוספו לאחרונה
            </Typography>
            {/* גלילה אופקית במקום שורה חדשה - שומר על גובה המודאל קבוע */}
            <Box sx={{
              display: 'flex', gap: 0.5,
              overflowX: 'auto', overflowY: 'hidden',
              pb: 0.5, mx: -0.25, px: 0.25,
              scrollSnapType: 'x proximity',
              scrollbarWidth: 'thin',
              WebkitOverflowScrolling: 'touch',
              '&::-webkit-scrollbar': { height: 3 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(20,184,166,0.3)', borderRadius: 2 },
            }}>
              {recentSuggestions.map(s => (
                <Box
                  key={`recent-${s.name}`}
                  onClick={() => applySuggestion(s)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    px: 1.25, py: 0.6,
                    borderRadius: '999px',
                    bgcolor: 'rgba(20,184,166,0.08)',
                    border: '1px solid rgba(20,184,166,0.2)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    scrollSnapAlign: 'start',
                    transition: 'all 0.15s',
                    '&:active': { transform: 'scale(0.95)', bgcolor: 'rgba(20,184,166,0.15)' },
                  }}
                >
                  <Typography sx={{ fontSize: 13 }}>{CATEGORY_ICONS[s.category] || '📦'}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'primary.main', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.name}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        {filteredSuggestions.length > 0 && (
          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {filteredSuggestions.map(s => (
              <Box
                key={s.name}
                onClick={() => applySuggestion(s)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.5,
                  borderRadius: '8px',
                  bgcolor: 'action.hover',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  '&:active': { transform: 'scale(0.95)' },
                }}
              >
                <Typography sx={{ fontSize: 13 }}>{CATEGORY_ICONS[s.category] || '📦'}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.primary', fontWeight: 500 }}>{s.name}</Typography>
              </Box>
            ))}
          </Box>
        )}
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
              style={{ flex: 1, border: 'none', textAlign: 'center', fontSize: 20, fontWeight: 600, outline: 'none', width: 50, background: 'transparent', color: 'inherit' }}
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
      <ProductNoteField
        value={newProduct.note}
        onChange={(v) => onUpdateField('note', v)}
      />
      <Box sx={{ mb: 2 }}>
        <Typography sx={labelSx}>{t('category')}</Typography>
        <CategoryGrid selected={newProduct.category} onSelect={handleCategoryClick} />
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
