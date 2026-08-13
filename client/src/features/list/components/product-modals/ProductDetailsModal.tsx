import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import type { Product } from '../../../../global/types';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, formatDateShort, formatTimeShort, getRelativeTime } from '../../../../global/helpers';
import { Modal } from '../../../../global/components';
import { useSettings } from '../../../../global/context/SettingsContext';

// ===== מודאל פרטי מוצר =====
interface ProductDetailsModalProps {
  product: Product | null;
  currentUserName: string;
  onClose: () => void;
}

interface HistoryEntry {
  key: string;
  icon: typeof AddCircleRoundedIcon;
  color: string;
  bgColor: string;
  label: string;
  person: string;
  highlight: boolean;
  timestamp?: string;
}

export const ProductDetailsModal = memo(({
  product,
  currentUserName,
  onClose
}: ProductDetailsModalProps) => {
  const { t, settings } = useSettings();

  if (!product) return null;

  const displayName = (name: string) => name === currentUserName ? t('you') : name;

  // ציר זמן: "נוסף" תמיד קיים (createdAt מדויק). "עודכן" מוצג רק אם יש
  // עורך שונה מהמוסיף. "נקנה" מוצג רק אם המוצר כרגע מסומן כנקנה ויש קונה.
  // ל-updatedAt יש ערך אחד בלבד למסמך (לא נפרד לכל פעולה) - לכן מציגים
  // אותו רק על השלב האחרון שבאמת קרה (נקנה אם קנייה, אחרת עדכון), כדי לא
  // לייחס זמן שגוי לפעולה הלא-נכונה.
  const hasUpdate = !!(product.updatedBy && product.updatedBy !== product.addedBy);
  const hasPurchase = !!(product.isPurchased && product.purchasedBy);

  const history: HistoryEntry[] = [
    {
      key: 'added',
      icon: AddCircleRoundedIcon,
      color: '#0D9488',
      bgColor: 'rgba(20,184,166,0.12)',
      label: t('addedBy'),
      person: displayName(product.addedBy),
      highlight: product.addedBy === currentUserName,
      timestamp: product.createdAt,
    },
    ...(hasUpdate ? [{
      key: 'updated',
      icon: EditRoundedIcon,
      color: '#D97706',
      bgColor: 'rgba(217,119,6,0.12)',
      label: t('updatedByLabel'),
      person: displayName(product.updatedBy!),
      highlight: product.updatedBy === currentUserName,
      timestamp: hasPurchase ? undefined : product.updatedAt,
    }] : []),
    ...(hasPurchase ? [{
      key: 'purchased',
      icon: ShoppingCartRoundedIcon,
      color: '#16A34A',
      bgColor: 'rgba(34,197,94,0.12)',
      label: t('purchasedByLabel'),
      person: displayName(product.purchasedBy!),
      highlight: product.purchasedBy === currentUserName,
      timestamp: product.updatedAt,
    }] : []),
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
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        bgcolor: 'background.default', borderRadius: '12px', border: '1px solid', borderColor: 'divider',
        p: '12px 16px', mb: 1.5,
      }}>
        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{t('category')}</Typography>
        <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>
          {t(CATEGORY_TRANSLATION_KEYS[product.category])}
        </Typography>
      </Box>

      {/* ציר זמן - היסטוריית הפעולות על המוצר (נוסף/עודכן/נקנה) */}
      <Box sx={{ bgcolor: 'background.default', borderRadius: '12px', border: '1px solid', borderColor: 'divider', p: '14px 16px' }}>
        {history.map((entry, index) => {
          const Icon = entry.icon;
          const isLast = index === history.length - 1;
          return (
            <Box key={entry.key} sx={{ display: 'flex', gap: 1.5, pb: isLast ? 0 : 1.5 }}>
              {/* עמודת נקודה + קו מחבר */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <Box sx={{
                  width: 30, height: 30, borderRadius: '50%',
                  bgcolor: entry.bgColor, color: entry.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon sx={{ fontSize: 17 }} />
                </Box>
                {!isLast && (
                  <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', borderRadius: 1, my: 0.5, minHeight: 14 }} />
                )}
              </Box>
              {/* תוכן הפעולה */}
              <Box sx={{ flex: 1, minWidth: 0, pt: 0.25, pb: isLast ? 0 : 0.5 }}>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 0.15 }}>
                  {entry.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14, color: entry.highlight ? 'primary.main' : 'text.primary' }}>
                    {entry.person}
                  </Typography>
                  {entry.timestamp && (
                    <Typography
                      sx={{ fontSize: 11, color: 'text.disabled', whiteSpace: 'nowrap', flexShrink: 0 }}
                      title={`${formatDateShort(entry.timestamp, settings.language)} ${formatTimeShort(entry.timestamp, settings.language)}`}
                    >
                      {getRelativeTime(entry.timestamp, settings.language)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
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
