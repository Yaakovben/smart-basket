import { memo, useState } from 'react';
import { Box, Typography, Collapse } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import type { Product, ProductEditChange, ProductCategory } from '../../../../global/types';
import { CATEGORY_ICONS, CATEGORY_COLORS, CATEGORY_TRANSLATION_KEYS, formatDateShort, formatTimeShort, getRelativeTime } from '../../../../global/helpers';
import { Modal, TapToRevealText, IconTile } from '../../../../global/components';
import { useSettings } from '../../../../global/context/SettingsContext';
import type { TranslationKeys } from '../../../../global/i18n/translations';

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
  editCount?: number;
}

const FIELD_LABEL_KEYS: Record<ProductEditChange['field'], TranslationKeys> = {
  name: 'productName',
  quantity: 'quantity',
  unit: 'unit',
  category: 'category',
  note: 'note',
};

// ערך שדה מתורגם לתצוגה - קטגוריה מתורגמת (הערך הגולמי הוא מפתח עברי קבוע
// ב-DB, לא בהכרח שפת התצוגה), שאר השדות מוצגים כמו שהם (גם unit, כמו בכל
// מקום אחר באפליקציה - אין מיפוי תרגום ליחידות).
const formatFieldValue = (field: ProductEditChange['field'], value: string | number, t: (k: TranslationKeys) => string): string => {
  if (field === 'category') return t(CATEGORY_TRANSLATION_KEYS[value as ProductCategory]);
  if (value === '' || value === undefined || value === null) return '—';
  return String(value);
};

// צבע+אייקון קבועים לפי סוג הפעולה - עקבי בכל מוצר, לא תלוי במי ביצע אותה:
// נוסף תמיד תורכיז, נערך תמיד כחול, נקנה תמיד ירוק. קל יותר לסרוק ויזואלית
// מאשר "מודגש רק כשזה אני". אייקוני MUI ולא גליפים טקסטואליים (✎/✓) -
// אלו מרנדרים לא אחיד בין פונטים/פלטפורמות בגדלים קטנים, קשה לזהות.
// גוונים מעומעמים (600/700 ולא 400/500 בוהקים) - הצבע מופיע רק בתג הקטן
// בפינת האווטאר, לא על כל העיגול/טקסט, כדי שזה יישאר עדין ולא "יצעק".
const ACTION_STYLE: Record<string, { color: string; Icon: typeof AddRoundedIcon }> = {
  added: { color: '#0D9488', Icon: AddRoundedIcon },
  updated: { color: '#475569', Icon: EditRoundedIcon },
  purchased: { color: '#16A34A', Icon: CheckRoundedIcon },
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
  const [editsExpanded, setEditsExpanded] = useState(false);

  if (!product) return null;

  const displayName = (name: string) => name === currentUserName ? t('you') : name;

  // ציר זמן: "נוסף" תמיד קיים (createdAt מדויק). "עודכן" מוצג בכל מקרה שיש
  // updatedBy - כולל כשהעורך הוא אותו אדם שהוסיף (המקרה הנפוץ ביותר בפועל).
  // בעבר הושוותה updatedBy מול addedBy וזה החביא את כל שורת "עודכן" (וההרחבה
  // עם פרטי העריכה בפועל) בדיוק במקרה הזה. "נקנה" מוצג רק אם המוצר כרגע
  // מסומן כנקנה ויש קונה. ל-updatedAt יש ערך אחד בלבד למסמך (לא נפרד לכל
  // פעולה) - לכן מציגים אותו רק על השלב האחרון שבאמת קרה (נקנה אם קנייה,
  // אחרת עדכון), כדי לא לייחס זמן שגוי לפעולה הלא-נכונה.
  const hasUpdate = !!product.updatedBy;
  const hasPurchase = !!(product.isPurchased && product.purchasedBy);
  // רשומות עריכה בפועל (עד 10 אחרונות, ראו MAX_EDIT_HISTORY בשרת) - ריק
  // אצל מוצר שנערך לפני שהפיצ'ר הזה קיים (יש updatedBy אבל אין לוג). מציגים
  // חדש-קודם כדי שהעריכה האחרונה תהיה ראשונה ברשימה המורחבת.
  const editEntries = [...(product.editHistory ?? [])].reverse();

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
      editCount: editEntries.length,
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
        <Box sx={{ mx: 'auto', mb: 1.5, width: 72 }}>
          <IconTile
            emoji={CATEGORY_ICONS[product.category]}
            color={CATEGORY_COLORS[product.category as keyof typeof CATEGORY_COLORS] || '#6B7280'}
            seedId={product.id}
            size={72}
            fontSize={36}
            ariaLabel={product.category}
            // אותו סגנון עדין כמו אייקון המוצר בשורת הרשימה (SwipeItem) -
            // לא הגרדיאנט הרווי + glow של אריח-רשימה, שנראה צעקני כאן.
            variant="light"
          />
        </Box>
        <TapToRevealText
          text={product.name}
          sx={{ fontSize: 20, fontWeight: 700, color: 'text.primary', mb: 0.5 }}
        />
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
          const isUpdatedRow = entry.key === 'updated';
          const canExpand = isUpdatedRow && !!entry.editCount && entry.editCount > 0;
          return (
            <Box key={entry.key} sx={{ display: 'flex', gap: 1.25 }}>
              {/* עמודת אווטאר + קו מחבר */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <Box sx={{
                  position: 'relative',
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: 'action.hover',
                  border: '1px solid', borderColor: 'divider',
                }}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', lineHeight: 1 }}>
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
                  סדר קריאה טבעי (כמו "Added by" ואז השם), לא הפוך. שורת
                  "עודכן" עם לוג עריכות אמיתי ניתנת להרחבה - שורה שלמה
                  לחיצה, חץ יחיד בקצה (לא צבוע/תג נפרד), פרטי העריכה
                  מוצגים כרשימה שקטה עם קווי הפרדה - לא כרטיס בתוך כרטיס. */}
              <Box sx={{ flex: 1, minWidth: 0, pb: isLast ? 0 : 1.5, pt: 0.25 }}>
                <Box
                  onClick={canExpand ? () => setEditsExpanded(v => !v) : undefined}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
                    cursor: canExpand ? 'pointer' : 'default',
                    WebkitTapHighlightColor: 'transparent',
                    ...(canExpand ? { mx: -0.5, px: 0.5, py: 0.25, borderRadius: '8px', '&:active': { bgcolor: 'action.hover' } } : {}),
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                      {entry.label}{canExpand && entry.editCount! > 1 ? ` · ${entry.editCount}` : ''}
                    </Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: entry.highlight ? 'primary.main' : 'text.primary', mt: 0.1 }}>
                      {entry.person}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                    {entry.timestamp && (
                      <Typography
                        sx={{ fontSize: 10.5, color: 'text.disabled', whiteSpace: 'nowrap' }}
                        title={`${formatDateShort(entry.timestamp, settings.language)} ${formatTimeShort(entry.timestamp, settings.language)}`}
                      >
                        {getRelativeTime(entry.timestamp, settings.language)}
                      </Typography>
                    )}
                    {canExpand && (
                      <ExpandMoreRoundedIcon sx={{
                        fontSize: 16, color: 'text.disabled',
                        transition: 'transform 0.15s ease',
                        transform: editsExpanded ? 'rotate(180deg)' : 'none',
                      }} />
                    )}
                  </Box>
                </Box>

                {canExpand && (
                  <Collapse in={editsExpanded}>
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                      {editEntries.map((edit, i) => (
                        <Box key={i} sx={{ mb: i < editEntries.length - 1 ? 1.1 : 0 }}>
                          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mb: 0.3 }}>
                            {displayName(edit.editedBy)} · {getRelativeTime(edit.editedAt, settings.language)}
                          </Typography>
                          {edit.changes.map((change, ci) => (
                            <Typography key={ci} sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t(FIELD_LABEL_KEYS[change.field])}:{' '}
                              <Box component="span" sx={{ color: 'text.disabled' }}>{formatFieldValue(change.field, change.oldValue, t)}</Box>
                              {' ← '}
                              <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>{formatFieldValue(change.field, change.newValue, t)}</Box>
                            </Typography>
                          ))}
                        </Box>
                      ))}
                    </Box>
                  </Collapse>
                )}
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
