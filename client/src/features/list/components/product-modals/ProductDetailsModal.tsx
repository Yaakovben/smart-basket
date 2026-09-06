import { memo, useState } from 'react';
import { Box, Typography, Collapse, Button } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import type { Product, ProductEditChange, ProductCategory } from '../../../../global/types';
import { CATEGORY_ICONS, CATEGORY_COLORS, CATEGORY_TRANSLATION_KEYS, formatDateShort, formatTimeShort, getRelativeTime } from '../../../../global/helpers';
import { cldPreview, cldFull, cldBlur } from '../../../../global/helpers/cloudinaryImage';
import { Modal, IconTile, ImageLightbox, ProgressiveImage } from '../../../../global/components';
import { PAPER_NOTE } from '../../helpers/paperNote';
import { useSettings } from '../../../../global/context/SettingsContext';
import type { TranslationKeys } from '../../../../global/i18n/translations';

// ===== מודאל פרטי מוצר =====
interface ProductDetailsModalProps {
  product: Product | null;
  currentUserName: string;
  onClose: () => void;
  // פותח את מודל עריכת המוצר (סוגר את מודל הפרטים). ראו ListComponent.
  onEdit: () => void;
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
  onClose,
  onEdit
}: ProductDetailsModalProps) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [editsExpanded, setEditsExpanded] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [nameExpanded, setNameExpanded] = useState(false);

  // פרטי העריכה תמיד נפתחים סגורים בכל פתיחה של המודל / החלפת מוצר -
  // המודל נשאר mounted אצל ההורה ורק ה-product prop מתחלף, אז בלי איפוס
  // מפורש מצב "פתוח" היה נדבק בין מוצרים. איפוס בזמן רינדור (הדפוס
  // המומלץ ב-React) ולא ב-useEffect.
  const [seenId, setSeenId] = useState(product?.id);
  if (product?.id !== seenId) {
    setSeenId(product?.id);
    setEditsExpanded(false);
    setShowPhoto(false);
    setNameExpanded(false);
  }

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
        {/* אזור עליון בגובה קבוע - שם המוצר וכל השדות שמתחת נשארים בדיוק
            באותו מיקום בין מוצר עם תמונה למוצר בלי, בלי "קפיצת" גובה
            דרמטית של המודל בכל פתיחה. */}
        <Box sx={{
          height: 148, mb: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {product.image ? (
            <Box
              role="button"
              aria-label={t('viewPhotoAria')}
              onClick={() => setShowPhoto(true)}
              sx={{
                position: 'relative',
                // מרובעת (לא מלבן) - רוחב = גובה, לא נמתחת לרוחב המודל
                height: '100%', width: 148,
                borderRadius: '12px', overflow: 'hidden',
                bgcolor: 'action.hover',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                '&:active': { transform: 'scale(0.99)' },
              }}
            >
              <ProgressiveImage
                src={cldPreview(product.image)}
                blurSrc={cldBlur(product.image)}
                alt={product.name}
                // בלי loading="lazy" - התמונה תמיד גלויה מיד עם פתיחת המודל
                // (לא ברשימה גוללת כמו SwipeItem), אין תועלת בדחיית טעינה.
                // fetchPriority מבקש מהדפדפן להקדים אותה מול בקשות אחרות.
                fetchPriority="high"
              />
              {/* מסגרת תכלת דקה - אותו תכלת של ההערה. overlay עם border
                  (לא box-shadow על img, שלא נצבע בחלק מגרסאות Safari). */}
              <Box aria-hidden="true" sx={{
                position: 'absolute', inset: 0,
                borderRadius: '12px',
                border: '1.5px solid',
                borderColor: isDark ? PAPER_NOTE.frameDark : PAPER_NOTE.frameLight,
                pointerEvents: 'none',
              }} />
              {/* כפתור הגדלה - אייקון "פתח במלא" מוכר בפינה, במקום תווית
                  "תמונה" שרק חוזרת על מה שכבר רואים. */}
              <Box aria-hidden="true" sx={{
                position: 'absolute', top: 8, insetInlineEnd: 8,
                width: 28, height: 28, borderRadius: '8px',
                bgcolor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <OpenInFullRoundedIcon sx={{ fontSize: 15, color: '#fff' }} />
              </Box>
            </Box>
          ) : (
            <IconTile
              emoji={CATEGORY_ICONS[product.category]}
              color={CATEGORY_COLORS[product.category as keyof typeof CATEGORY_COLORS] || '#6B7280'}
              seedId={product.id}
              size={76}
              fontSize={38}
              ariaLabel={product.category}
              // אותו טינט בהיר כמו אייקון המוצר בשורת הרשימה (SwipeItem).
              variant="light"
            />
          )}
        </Box>
        {/* שם - עד 2 שורות כברירת מחדל כדי לא לדחוף את שאר התוכן למטה;
            הקשה מרחיבה לשם המלא (אין טקסט מוסתר לצמיתות). גופן רספונסיבי
            לרוחב המסך. */}
        <Typography
          onClick={() => setNameExpanded(v => !v)}
          title={product.name}
          sx={{
            fontSize: { xs: 17, sm: 20 }, fontWeight: 700, color: 'text.primary', mb: 0.5,
            lineHeight: 1.3, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            wordBreak: 'break-word',
            ...(nameExpanded
              ? { whiteSpace: 'pre-wrap' }
              : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
          }}
        >
          {product.name}
        </Typography>
        <Typography sx={{ fontSize: 15, color: 'primary.main', fontWeight: 600 }}>
          {product.quantity} {product.unit}
        </Typography>
        {/* לחצן עריכה עדין - קישור טקסט שקט, לא כפתור מלא. סוגר את מודל
            הפרטים ופותח את מודל עריכת המוצר (ListComponent). */}
        <Button
          onClick={onEdit}
          disableRipple
          startIcon={<EditRoundedIcon sx={{ fontSize: 15 }} />}
          sx={{
            mt: 0.75, py: 0.25, px: 1, minWidth: 0,
            color: 'text.secondary', fontSize: 12, fontWeight: 600,
            textTransform: 'none', borderRadius: '999px',
            '& .MuiButton-startIcon': { mr: 0.4, ml: 0 },
            '&:hover': { bgcolor: 'transparent', color: 'primary.main' },
            '&:active': { opacity: 0.6 },
          }}
        >
          {t('editProduct')}
        </Button>
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

      {/* הערה - פתק נייר, בגרסת הפרטים: כרטיס מעוגל עם פינה תחתונה-שמאלית
          מגולגלת (page-curl). ה"גלגול" הוא סהרון (mask רדיאלי חותך את הקצה
          הפנימי לעקומה) עם גרדיאנט אלכסוני: כהה בקצה החיצוני (גב הדף
          המגולגל) -> בהיר/לבן בקודקוד (קצה הגלגול שתופס אור). drop-shadow
          עוקב אחרי הצורה. בלי משולש חד, בלי קופסה. הפינה התחתונה-שמאלית של
          הכרטיס כמעט מרובעת (2px) כדי שהגלגול יישב עליה. אותם גוונים
          (PAPER_NOTE) + סרט washi. מוצגת מעל ההיסטוריה. */}
      {product.note && (
        <Box sx={{
          position: 'relative',
          mt: 1, mb: 2,
          pt: 2, pr: 2, pl: 2.5, pb: 2.5,
          borderRadius: '16px 16px 16px 2px',
          backgroundImage: isDark ? PAPER_NOTE.fillDark : PAPER_NOTE.fillLight,
          border: '1px solid',
          borderColor: isDark ? PAPER_NOTE.edgeDark : PAPER_NOTE.edgeLight,
          transform: 'rotate(-0.5deg)',
          boxShadow: isDark
            ? '0 12px 28px rgba(0,0,0,0.42), 0 3px 8px rgba(0,0,0,0.28)'
            : [
                'inset 0 1px 0 rgba(255,255,255,0.8)',
                '0 2px 6px rgba(15,118,110,0.08)',
                '0 14px 32px rgba(20,184,166,0.16)',
              ].join(', '),
          '&::after': {
            content: '""',
            position: 'absolute',
            left: -3, bottom: -3,
            width: 40, height: 40,
            pointerEvents: 'none',
            background: isDark
              ? 'linear-gradient(48deg, rgba(4,47,43,0.92) 0%, rgba(20,184,166,0.42) 34%, rgba(94,234,212,0.7) 74%, rgba(190,247,239,0.92) 100%)'
              : 'linear-gradient(48deg, #5FB4A6 0%, #86CEC1 30%, #E6F6F2 62%, #FFFFFF 88%, #F0FDFA 100%)',
            WebkitMaskImage: 'radial-gradient(circle 37px at 100% 0, transparent 36px, #000 37px)',
            maskImage: 'radial-gradient(circle 37px at 100% 0, transparent 36px, #000 37px)',
            filter: isDark
              ? 'drop-shadow(2px -2px 3px rgba(0,0,0,0.5))'
              : 'drop-shadow(2px -2px 3px rgba(15,118,110,0.32))',
          },
        }}>
          {/* סרט washi באמצע למעלה */}
          <Box sx={{
            position: 'absolute', top: -7, left: '50%',
            transform: 'translateX(-50%) rotate(-1deg)',
            width: 64, height: 12,
            backgroundImage: 'linear-gradient(180deg, rgba(20,184,166,0.45) 0%, rgba(13,148,136,0.55) 100%)',
            borderRadius: '2px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 2px rgba(15,118,110,0.2)',
            zIndex: 2,
          }} />
          <Box sx={{ position: 'relative', zIndex: 2, mb: 0.85 }}>
            <Typography sx={{
              fontSize: 10, fontWeight: 800,
              color: isDark ? PAPER_NOTE.inkDark : PAPER_NOTE.inkLight,
              letterSpacing: 1.2, textTransform: 'uppercase',
            }}>
              {t('note')}
            </Typography>
          </Box>
          <Typography sx={{
            position: 'relative', zIndex: 2,
            fontSize: 14.5,
            color: isDark ? PAPER_NOTE.textDark : PAPER_NOTE.textLight,
            fontWeight: 500,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {product.note}
          </Typography>
        </Box>
      )}

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
                    {/* לוג עריכות ארוך - גליל בתוך גובה מוגבל במקום לדחוף
                        את שאר ציר הזמן. הטקסט של כל שינוי נשבר לשורות
                        ומוצג במלואו (בלי ellipsis) כדי שכל הערך שנערך יהיה
                        קריא. */}
                    <Box sx={{
                      mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider',
                      maxHeight: 220, overflowY: 'auto', overscrollBehavior: 'contain',
                    }}>
                      {editEntries.map((edit, i) => (
                        <Box key={i} sx={{ mb: i < editEntries.length - 1 ? 1.1 : 0 }}>
                          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mb: 0.3 }}>
                            {displayName(edit.editedBy)} · {getRelativeTime(edit.editedAt, settings.language)}
                          </Typography>
                          {edit.changes.map((change, ci) => (
                            <Typography key={ci} sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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

      {showPhoto && product.image && (
        <ImageLightbox src={cldFull(product.image)} alt={product.name} onClose={() => setShowPhoto(false)} />
      )}
    </Modal>
  );
});

ProductDetailsModal.displayName = 'ProductDetailsModal';
