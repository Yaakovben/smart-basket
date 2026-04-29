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
// עיצוב פתק יצירתי: סלוטייפ באמצע למעלה, פינה מקופלת בשמאל-עליון,
// הטיה קלה, קווי מחברת עדינים, וגופן Caveat איטלי.
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
        // מצב סגור - פתק מיני מקופל, יצירתי וקטן עם הטיה
        <Box
          role="button"
          tabIndex={0}
          onClick={() => { haptic('light'); setExpanded(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { haptic('light'); setExpanded(true); } }}
          sx={{
            position: 'relative',
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            py: 0.55, pl: 1.1, pr: 1.4,
            cursor: 'pointer', userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            color: '#0D9488',
            bgcolor: '#E0F7F4',
            transform: 'rotate(-1.2deg)',
            boxShadow: '0 1.5px 4px rgba(20,184,166,0.18)',
            transition: 'all 0.18s',
            // פינה מקופלת בצד שמאל-עליון
            clipPath: 'polygon(7px 0, 100% 0, 100% 100%, 0 100%, 0 7px)',
            '&::before': {
              content: '""',
              position: 'absolute', top: 0, left: 0,
              width: 8, height: 8,
              bgcolor: 'rgba(13,148,136,0.25)',
              clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
            },
            '&:hover': { bgcolor: '#CCF1EC', transform: 'rotate(-0.6deg) translateY(-1px)' },
          }}
        >
          <Typography sx={{ fontSize: 12, lineHeight: 1 }}>📝</Typography>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, fontStyle: 'italic' }}>
            הוסף הערה
          </Typography>
        </Box>
      ) : (
        // מצב פתוח - "פתק" עם סלוטייפ באמצע למעלה, פינה מקופלת ונטייה קלה
        <Box sx={{
          position: 'relative',
          mt: 1.5, mb: 0.5,
          px: 1.1, pt: 1.4, pb: 0.9,
          bgcolor: '#E6F9F5',
          backgroundImage: 'linear-gradient(180deg, #EAFBF7 0%, #DCF4EE 100%)',
          transform: 'rotate(-0.6deg)',
          boxShadow: '0 2px 6px rgba(20,184,166,0.18), 0 6px 14px rgba(0,0,0,0.05)',
          clipPath: 'polygon(14px 0, 100% 0, 100% 100%, 0 100%, 0 14px)',
          // קווי "מחברת" עדינים ברקע
          '&::after': {
            content: '""', position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(transparent 0, transparent 20px, rgba(20,184,166,0.08) 20px, rgba(20,184,166,0.08) 21px)',
            pointerEvents: 'none',
          },
          // משולש פינה מקופלת
          '&::before': {
            content: '""', position: 'absolute', top: 0, left: 0,
            width: 16, height: 16,
            bgcolor: 'rgba(13,148,136,0.22)',
            clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
            zIndex: 1,
          },
        }}>
          {/* "סלוטייפ" באמצע למעלה */}
          <Box sx={{
            position: 'absolute', top: -8, left: '50%',
            transform: 'translateX(-50%) rotate(-2deg)',
            width: 46, height: 14,
            bgcolor: 'rgba(20,184,166,0.35)',
            border: '1px dashed rgba(13,148,136,0.4)',
            borderRadius: '2px',
            backdropFilter: 'blur(2px)',
            zIndex: 2,
          }} />
          <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.5 }}>
            <Typography sx={{ fontSize: 13 }}>📝</Typography>
            <Box sx={{ flex: 1, lineHeight: 1.1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#0D9488', letterSpacing: 0.3, fontStyle: 'italic' }}>
                הערה למוצר
              </Typography>
              <Typography sx={{ fontSize: 9, color: 'rgba(13,148,136,0.75)', fontWeight: 600, mt: 0.1 }}>
                כשרות, אחוז שומן, וכו׳
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 9.5, color: value.length >= 180 ? '#EF4444' : 'rgba(13,148,136,0.7)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              {value.length}/200
            </Typography>
            <Box
              role="button"
              aria-label="סגור הערה"
              onClick={closeAndClear}
              sx={{
                width: 18, height: 18, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: 'rgba(20,184,166,0.22)',
                color: '#0D9488',
                cursor: 'pointer', userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                fontSize: 11, fontWeight: 800, lineHeight: 1,
                '&:hover': { bgcolor: 'rgba(20,184,166,0.35)' },
              }}
            >
              ✕
            </Box>
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={1}
            maxRows={2}
            size="small"
            autoFocus={expanded && value.length === 0}
            value={value}
            onChange={e => onChange(e.target.value.slice(0, 200))}
            placeholder="פרט על המוצר - כשרות, אחוז שומן וכו׳"
            inputProps={{ maxLength: 200 }}
            sx={{
              position: 'relative', zIndex: 2,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'transparent',
                fontSize: 13,
                fontFamily: '"Caveat", "Comic Sans MS", "Segoe Script", cursive',
                fontStyle: 'italic',
                py: 0.25,
                '& fieldset': { border: 'none' },
                '&.Mui-focused fieldset': { border: 'none' },
              },
              '& textarea': { lineHeight: '21px' },
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
      {/* הערה - כרטיס ציטוט אלגנטי עם תווית צפה, מרכאה דקורטיבית, וזוהר עדין */}
      {product.note && (
        <Box sx={{
          position: 'relative',
          mt: 3, mb: 0.5,
          pl: 2.25, pr: 2.25, pt: 2.2, pb: 1.6,
          borderRadius: '18px',
          overflow: 'hidden',
          backgroundImage: 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 50%, #ECFDF5 100%)',
          border: '1px solid rgba(20,184,166,0.2)',
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.9)',
            '0 1px 3px rgba(15,118,110,0.05)',
            '0 10px 28px rgba(20,184,166,0.1)',
            '0 28px 56px rgba(15,118,110,0.06)',
          ].join(', '),
          // היילייט עליון עדין
          '&::before': {
            content: '""', position: 'absolute',
            top: 0, left: '15%', right: '15%', height: 1,
            backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(20,184,166,0.4) 50%, transparent 100%)',
          },
        }}>
          {/* מרכאת ציטוט גדולה דקורטיבית ברקע */}
          <Box sx={{
            position: 'absolute',
            top: -14, right: 14,
            fontSize: 96, lineHeight: 1,
            fontFamily: 'Georgia, "Times New Roman", serif',
            color: 'rgba(20,184,166,0.10)',
            fontWeight: 700,
            pointerEvents: 'none',
            userSelect: 'none',
          }}>
            ”
          </Box>
          {/* תווית "הערה" צפה - חופפת את הגבול העליון */}
          <Box sx={{
            position: 'absolute',
            top: -10, right: 18,
            display: 'flex', alignItems: 'center', gap: 0.5,
            px: 1, py: 0.35, borderRadius: '999px',
            backgroundImage: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
            boxShadow: [
              'inset 0 1px 0 rgba(255,255,255,0.3)',
              '0 2px 6px rgba(15,118,110,0.35)',
              '0 0 0 3px #FFFFFF',
            ].join(', '),
          }}>
            <Box sx={{
              width: 5, height: 5, borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.95)',
              boxShadow: '0 0 4px rgba(255,255,255,0.7)',
            }} />
            <Typography sx={{
              fontSize: 9.5, fontWeight: 800, color: '#fff',
              letterSpacing: 1.2, textTransform: 'uppercase',
            }}>
              הערה
            </Typography>
          </Box>
          <Typography sx={{
            position: 'relative', zIndex: 1,
            fontSize: 15, color: '#134E4A',
            fontWeight: 500,
            lineHeight: 1.6,
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
