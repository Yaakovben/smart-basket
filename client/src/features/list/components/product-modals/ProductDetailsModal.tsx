import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import type { Product } from '../../../../global/types';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, formatDateShort, formatTimeShort } from '../../../../global/helpers';
import { Modal } from '../../../../global/components';
import { useSettings } from '../../../../global/context/SettingsContext';

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

  // "עודכן ע״י" מוצג רק אם יש עורך שונה מהמוסיף (עריכה בפועל קרתה, לא
  // רק הוספה). "נקנה ע״י" מוצג רק אם המוצר כרגע מסומן כנקנה ויש לו קונה.
  const detailRows = [
    { label: t('category'), value: t(CATEGORY_TRANSLATION_KEYS[product.category]) },
    { label: t('addedBy'), value: product.addedBy === currentUserName ? t('you') : product.addedBy, highlight: product.addedBy === currentUserName },
    ...(product.updatedBy && product.updatedBy !== product.addedBy
      ? [{ label: t('updatedByLabel'), value: product.updatedBy === currentUserName ? t('you') : product.updatedBy, highlight: product.updatedBy === currentUserName }]
      : []),
    ...(product.isPurchased && product.purchasedBy
      ? [{ label: t('purchasedByLabel'), value: product.purchasedBy === currentUserName ? t('you') : product.purchasedBy, highlight: product.purchasedBy === currentUserName }]
      : []),
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
      {/* הערה - גרסה מבוגרת ומלוטשת: סרט washi עדין, הטיה כמעט-שטוחה,
          טיפוגרפיה מינימלית. תואם למצב הפתוח של ProductNoteField. */}
      {product.note && (
        <Box sx={{
          position: 'relative',
          mt: 3, mb: 0.5,
          px: 2, pt: 2, pb: 1.4,
          backgroundImage: 'linear-gradient(180deg, #F0FDFA 0%, #E6F9F5 100%)',
          transform: 'rotate(-0.15deg)',
          border: '1px solid rgba(20,184,166,0.18)',
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.85)',
            '0 1px 2px rgba(15,118,110,0.06)',
            '0 8px 20px rgba(20,184,166,0.10)',
            '0 22px 44px rgba(15,118,110,0.05)',
          ].join(', '),
          clipPath: 'polygon(18px 0, 100% 0, 100% 100%, 0 100%, 0 18px)',
          // קווי מחברת מאוד עדינים
          '&::after': {
            content: '""', position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(transparent 0, transparent 25px, rgba(20,184,166,0.06) 25px, rgba(20,184,166,0.06) 26px)',
            pointerEvents: 'none',
          },
          // פינה מקופלת בשמאל-עליון
          '&::before': {
            content: '""', position: 'absolute', top: 0, left: 0,
            width: 20, height: 20,
            bgcolor: 'rgba(13,148,136,0.18)',
            clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
            zIndex: 1,
          },
        }}>
          {/* סרט washi באמצע למעלה */}
          <Box sx={{
            position: 'absolute', top: -7, left: '50%',
            transform: 'translateX(-50%) rotate(-1deg)',
            width: 64, height: 12,
            backgroundImage: 'linear-gradient(180deg, rgba(20,184,166,0.45) 0%, rgba(13,148,136,0.55) 100%)',
            borderRadius: '1px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 2px rgba(15,118,110,0.2)',
            zIndex: 2,
          }} />
          <Box sx={{ position: 'relative', zIndex: 2, mb: 0.85 }}>
            <Typography sx={{
              fontSize: 10, fontWeight: 800, color: '#0F766E',
              letterSpacing: 1.2, textTransform: 'uppercase',
            }}>
              {t('note')}
            </Typography>
          </Box>
          <Typography sx={{
            position: 'relative', zIndex: 2,
            fontSize: 14.5, color: '#134E4A',
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
