import { memo, useRef, useCallback, useMemo, useState } from 'react';
import { Box, Typography, TextField, Button, Select, MenuItem, Alert, FormControl, CircularProgress } from '@mui/material';
import type { Product, ProductUnit, ProductCategory } from '../../../global/types';
import { haptic, CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, COMMON_STYLES, formatDateShort, formatTimeShort } from '../../../global/helpers';
import { detectCategory } from '../../../global/helpers/categoryDetector';
import { Modal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import type { NewProductForm } from '../types/list-types';

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

// ===== שדה הערה - משותף ל-Add ול-Edit =====
// עיצוב פרימיום: glassmorphism עדין, פס מבטא צד, צל רב-שכבתי, טיפוגרפיה מינימלית.
// מצב סגור: צ'יפ עם תג אייקון מתכתי. מצב פתוח: כרטיס עם פס טורקיז מימין (RTL).
const ProductNoteField = memo(({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [expanded, setExpanded] = useState(value.length > 0);
  const isOpen = expanded || value.length > 0;

  const closeAndClear = () => {
    haptic('light');
    onChange('');
    setExpanded(false);
  };

  return (
    <Box sx={{ mb: 1.25 }}>
      {!isOpen ? (
        // מצב סגור - צ'יפ פרימיום עם תג + מתכתי
        <Box
          role="button"
          tabIndex={0}
          onClick={() => { haptic('light'); setExpanded(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { haptic('light'); setExpanded(true); } }}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.7,
            pl: 0.4, pr: 1.2, py: 0.4,
            borderRadius: '999px',
            cursor: 'pointer', userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            color: '#0F766E',
            backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(204,241,236,0.55) 100%)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(20,184,166,0.28)',
            boxShadow: '0 1px 2px rgba(15,118,110,0.06), 0 2px 8px rgba(20,184,166,0.10)',
            transition: 'all 0.18s ease',
            '&:hover': {
              borderColor: 'rgba(20,184,166,0.5)',
              boxShadow: '0 2px 4px rgba(15,118,110,0.08), 0 4px 14px rgba(20,184,166,0.18)',
              transform: 'translateY(-0.5px)',
            },
            '&:active': { transform: 'translateY(0)' },
          }}
        >
          <Box sx={{
            width: 20, height: 20, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundImage: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 2px rgba(15,118,110,0.3)',
            color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1,
          }}>+</Box>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.2 }}>
            הוסף הערה
          </Typography>
        </Box>
      ) : (
        // מצב פתוח - כרטיס פרימיום: glassmorphism, פס מבטא ימין (RTL), צל עומק רב-שכבתי
        <Box sx={{
          position: 'relative',
          mt: 1.5, mb: 0.5,
          pl: 1.25, pr: 1.6, pt: 0.85, pb: 0.55,
          borderRadius: '14px',
          backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(236,253,250,0.85) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(20,184,166,0.22)',
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.7)',
            '0 1px 2px rgba(15,118,110,0.06)',
            '0 6px 18px rgba(20,184,166,0.10)',
            '0 16px 36px rgba(15,118,110,0.06)',
          ].join(', '),
          // פס מבטא טורקיז מימין (RTL)
          '&::before': {
            content: '""', position: 'absolute',
            top: 10, bottom: 10, right: 0,
            width: 3, borderRadius: '3px 0 0 3px',
            backgroundImage: 'linear-gradient(180deg, #14B8A6 0%, #0D9488 100%)',
            boxShadow: '0 0 8px rgba(20,184,166,0.45)',
          },
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mb: 0.25 }}>
            <Typography sx={{
              fontSize: 9.5, fontWeight: 800, color: '#0F766E',
              letterSpacing: 1.2, textTransform: 'uppercase', flex: 1,
            }}>
              הערה
            </Typography>
            <Box sx={{
              px: 0.7, py: 0.15, borderRadius: '999px',
              bgcolor: value.length >= 180 ? 'rgba(239,68,68,0.10)' : 'rgba(20,184,166,0.10)',
              border: '1px solid',
              borderColor: value.length >= 180 ? 'rgba(239,68,68,0.3)' : 'rgba(20,184,166,0.22)',
            }}>
              <Typography sx={{
                fontSize: 9, fontWeight: 700,
                color: value.length >= 180 ? '#DC2626' : '#0F766E',
                fontVariantNumeric: 'tabular-nums', letterSpacing: 0.3,
              }}>
                {value.length}/200
              </Typography>
            </Box>
            <Box
              role="button"
              aria-label="סגור הערה"
              onClick={closeAndClear}
              sx={{
                width: 20, height: 20, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0F766E',
                cursor: 'pointer', userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                fontSize: 12, fontWeight: 700, lineHeight: 1,
                transition: 'all 0.15s',
                '&:hover': { bgcolor: 'rgba(20,184,166,0.12)', color: '#0D9488' },
              }}
            >
              ✕
            </Box>
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={1}
            maxRows={3}
            size="small"
            autoFocus={expanded && value.length === 0}
            value={value}
            onChange={e => onChange(e.target.value.slice(0, 200))}
            placeholder="כשרות, אחוז שומן, מותג מועדף…"
            inputProps={{ maxLength: 200 }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'transparent',
                fontSize: 13.5,
                fontWeight: 500,
                color: '#134E4A',
                py: 0.1,
                '& fieldset': { border: 'none' },
                '&.Mui-focused fieldset': { border: 'none' },
              },
              '& textarea::placeholder': {
                color: 'rgba(15,118,110,0.5)',
                fontStyle: 'italic',
                opacity: 1,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
});
ProductNoteField.displayName = 'ProductNoteField';


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

  const applySuggestion = useCallback((s: ProductSuggestion) => {
    onUpdateField('name', s.name);
    onUpdateField('category', s.category);
    onUpdateField('unit', s.unit);
    userChangedCategory.current = true;
    haptic('light');
  }, [onUpdateField]);

  // זיהוי אוטומטי של קטגוריה בזמן הקלדה
  const detectedCategory = useMemo(() => {
    const name = newProduct.name.trim();
    if (name.length < 2) return null;
    const detected = detectCategory(name);
    return detected !== 'אחר' ? detected : null;
  }, [newProduct.name]);

  // עדכון קטגוריה אוטומטי אם המשתמש לא בחר ידנית
  const userChangedCategory = useRef(false);
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
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
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
                    transition: 'all 0.15s',
                    '&:active': { transform: 'scale(0.95)', bgcolor: 'rgba(20,184,166,0.15)' },
                  }}
                >
                  <Typography sx={{ fontSize: 13 }}>{CATEGORY_ICONS[s.category] || '📦'}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'primary.main', fontWeight: 700 }}>{s.name}</Typography>
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
      <Box sx={{ mb: 2 }}>
        <Typography sx={labelSx}>{t('category')}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.75 }} role="radiogroup" aria-label={t('category')}>
          {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => {
            const isSelected = newProduct.category === cat;
            return (
              <Box
                key={cat}
                onClick={() => handleCategoryClick(cat as ProductCategory)}
                role="radio"
                aria-checked={isSelected}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  py: 1.25,
                  px: 0.25,
                  borderRadius: '14px',
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: isSelected ? 'primary.main' : 'rgba(20,184,166,0.15)',
                  bgcolor: isSelected ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.04)',
                  boxShadow: isSelected ? '0 2px 8px rgba(20,184,166,0.2)' : 'none',
                  transition: 'all 0.2s',
                  '&:active': { transform: 'scale(0.93)' },
                }}
              >
                <Box sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  bgcolor: isSelected ? 'rgba(20,184,166,0.15)' : 'background.paper',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  transition: 'all 0.2s',
                }}>
                  {icon}
                </Box>
                <Typography sx={{
                  fontSize: 9.5,
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? 'primary.main' : 'text.secondary',
                  textAlign: 'center',
                  lineHeight: 1.15,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {t(CATEGORY_TRANSLATION_KEYS[cat as ProductCategory])}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
      <ProductNoteField
        value={newProduct.note}
        onChange={(v) => onUpdateField('note', v)}
      />
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
    <Modal title={t('editProduct')} onClose={() => !saving && onClose()}>
      <Box sx={{ mb: 2 }}>
        <Typography component="label" htmlFor="edit-product-name" sx={labelSx}>{t('name')}</Typography>
        <TextField
          autoFocus
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
      <Box sx={{ mb: 2 }}>
        <Typography sx={labelSx}>{t('category')}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.75 }} role="radiogroup" aria-label={t('category')}>
          {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => {
            const isSelected = product.category === cat;
            return (
              <Box
                key={cat}
                onClick={() => { haptic('light'); onUpdateField('category', cat as ProductCategory); }}
                role="radio"
                aria-checked={isSelected}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  py: 1.25,
                  px: 0.25,
                  borderRadius: '14px',
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: isSelected ? 'primary.main' : 'rgba(20,184,166,0.15)',
                  bgcolor: isSelected ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.04)',
                  boxShadow: isSelected ? '0 2px 8px rgba(20,184,166,0.2)' : 'none',
                  transition: 'all 0.2s',
                  '&:active': { transform: 'scale(0.93)' },
                }}
              >
                <Box sx={{
                  width: 36, height: 36, borderRadius: '10px',
                  bgcolor: isSelected ? 'rgba(20,184,166,0.15)' : 'background.paper',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, transition: 'all 0.2s',
                }}>
                  {icon}
                </Box>
                <Typography sx={{
                  fontSize: 9.5, fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? 'primary.main' : 'text.secondary',
                  textAlign: 'center', lineHeight: 1.15,
                  maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {t(CATEGORY_TRANSLATION_KEYS[cat as ProductCategory])}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
      <ProductNoteField
        value={product.note || ''}
        onChange={(v) => onUpdateField('note', v as Product['note'])}
      />
      <Button variant="contained" fullWidth onClick={() => { haptic('medium'); onSave(); }} disabled={!canSave}>
        {saving ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('save')}
      </Button>
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
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 1.5,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
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
      {/* הערה - כרטיס פרימיום: glassmorphism, פס מבטא צד, צל עומק רב-שכבתי */}
      {product.note && (
        <Box sx={{
          position: 'relative',
          mt: 2, mb: 0.5,
          pl: 1.75, pr: 2, pt: 1.4, pb: 1.4,
          borderRadius: '16px',
          backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(236,253,250,0.88) 100%)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(20,184,166,0.22)',
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.7)',
            '0 1px 2px rgba(15,118,110,0.06)',
            '0 8px 24px rgba(20,184,166,0.12)',
            '0 22px 48px rgba(15,118,110,0.07)',
          ].join(', '),
          '&::before': {
            content: '""', position: 'absolute',
            top: 14, bottom: 14, right: 0,
            width: 3, borderRadius: '3px 0 0 3px',
            backgroundImage: 'linear-gradient(180deg, #14B8A6 0%, #0D9488 100%)',
            boxShadow: '0 0 10px rgba(20,184,166,0.5)',
          },
        }}>
          <Typography sx={{
            fontSize: 10, fontWeight: 800, color: '#0F766E',
            letterSpacing: 1.4, textTransform: 'uppercase', mb: 0.7,
          }}>
            הערה
          </Typography>
          <Typography sx={{
            fontSize: 14, color: '#134E4A',
            fontWeight: 500,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {product.note}
          </Typography>
        </Box>
      )}
    </Modal>
  );
});

ProductDetailsModal.displayName = 'ProductDetailsModal';
