import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
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
  label: string;
  person: string;
  highlight: boolean;
  timestamp?: string;
  color: string;
  Icon: typeof AddRoundedIcon;
}

// צבע+אייקון קבועים לפי סוג הפעולה - עקבי בכל מוצר, לא תלוי במי ביצע אותה:
// נוסף תמיד תורכיז, נערך תמיד כחול, נקנה תמיד ירוק. קל יותר לסרוק ויזואלית
// מאשר "מודגש רק כשזה אני". אייקוני MUI ולא גליפים טקסטואליים (✎/✓) -
// אלו מרנדרים לא אחיד בין פונטים/פלטפורמות בגדלים קטנים, קשה לזהות.
const ACTION_STYLE: Record<string, { color: string; Icon: typeof AddRoundedIcon }> = {
  added: { color: '#14B8A6', Icon: AddRoundedIcon },
  updated: { color: '#3B82F6', Icon: EditRoundedIcon },
  purchased: { color: '#22C55E', Icon: CheckRoundedIcon },
};

// ראשי תיבות מהשם המלא - עד שתי אותיות ("דני כהן" → "דכ", "דני" → "ד")
const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.length === 1 ? parts[0].slice(0, 1) : parts[0].slice(0, 1) + parts[1].slice(0, 1);
};

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
      label: t('addedBy'),
      person: displayName(product.addedBy),
      highlight: product.addedBy === currentUserName,
      timestamp: product.createdAt,
      ...ACTION_STYLE.added,
    },
    ...(hasUpdate ? [{
      key: 'updated',
      label: t('updatedByLabel'),
      person: displayName(product.updatedBy!),
      highlight: product.updatedBy === currentUserName,
      timestamp: hasPurchase ? undefined : product.updatedAt,
      ...ACTION_STYLE.updated,
    }] : []),
    ...(hasPurchase ? [{
      key: 'purchased',
      label: t('purchasedByLabel'),
      person: displayName(product.purchasedBy!),
      highlight: product.purchasedBy === currentUserName,
      timestamp: product.updatedAt,
      ...ACTION_STYLE.purchased,
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

      {/* היסטוריית הפעולות על המוצר (נוסף/עודכן/נקנה) - ציר פעילות עם
          "אווטאר" ראשי-תיבות צבעוני לכל פעולה (צבע+גליף קבועים לפי הסוג,
          ACTION_STYLE) וקו מחבר דק ביניהם - דפוס מוכר מכלי עבודה מקצועיים
          (activity feed), קריא יותר מרשימת טקסט שטוחה. */}
      <Box sx={{ bgcolor: 'background.default', borderRadius: '12px', border: '1px solid', borderColor: 'divider', p: '14px 16px' }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.3, textTransform: 'uppercase', mb: 1.25 }}>
          {t('history')}
        </Typography>
        {history.map((entry, index) => {
          const isLast = index === history.length - 1;
          return (
            <Box key={entry.key} sx={{ display: 'flex', gap: 1.25 }}>
              {/* עמודת אווטאר + קו מחבר */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <Box sx={{
                  position: 'relative',
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: `${entry.color}1A`,
                  border: '1.5px solid', borderColor: `${entry.color}40`,
                }}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: entry.color, lineHeight: 1 }}>
                    {initials(entry.person)}
                  </Typography>
                  <Box sx={{
                    position: 'absolute', bottom: -3, insetInlineEnd: -3,
                    width: 16, height: 16, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: entry.color,
                    border: '2px solid', borderColor: 'background.default',
                  }}>
                    <entry.Icon sx={{ fontSize: 11, color: 'white' }} />
                  </Box>
                </Box>
                {!isLast && (
                  <Box sx={{ width: 1.5, flex: 1, minHeight: 18, bgcolor: 'divider', my: 0.5, borderRadius: 1 }} />
                )}
              </Box>

              {/* תוכן הפעולה - התווית ("נוסף ע״י") קודם, השם אחריה למטה:
                  סדר קריאה טבעי (כמו "Added by" ואז השם), לא הפוך. */}
              <Box sx={{ flex: 1, minWidth: 0, pb: isLast ? 0 : 1.5, pt: 0.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                    {entry.label}
                  </Typography>
                  {entry.timestamp && (
                    <Typography
                      sx={{ fontSize: 10.5, color: 'text.disabled', whiteSpace: 'nowrap', flexShrink: 0 }}
                      title={`${formatDateShort(entry.timestamp, settings.language)} ${formatTimeShort(entry.timestamp, settings.language)}`}
                    >
                      {getRelativeTime(entry.timestamp, settings.language)}
                    </Typography>
                  )}
                </Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: entry.highlight ? entry.color : 'text.primary', mt: 0.1 }}>
                  {entry.person}
                </Typography>
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
