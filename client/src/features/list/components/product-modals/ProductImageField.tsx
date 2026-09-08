import { memo, useRef, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import BrokenImageRoundedIcon from '@mui/icons-material/BrokenImageRounded';
import { haptic } from '../../../../global/helpers';
import { cldThumb, cldFull, cldBlur } from '../../../../global/helpers/cloudinaryImage';
import { PAPER_NOTE, addChipSx } from '../../helpers/paperNote';
import { useSettings } from '../../../../global/context/SettingsContext';
import { ImageLightbox, ProgressiveImage } from '../../../../global/components';
import { compressProductImage, buildUploadMaster, uploadToServer, isNotConfiguredError, ImageUploadError } from '../../../../global/services/imageUpload';

// ===== שדה תמונת מוצר - משותף ל-Add ול-Edit =====
// עיצוב אחיד לחלוטין עם ProductNoteField: אותו צ'יפ תכלת סגור, אותם
// גוונים (PAPER_NOTE), אותה מסגרת נייר. הערה ותמונה = אותה שפה, אותו צבע.
interface Props {
  value: string;
  onChange: (v: string) => void;
  // נקרא פעם אחת כשמתחילה העלאה ברקע, עם ה-promise שלה (הכתובת הסופית או
  // null בכשל/לא-מוגדר). למי-שקורה? AddProductModal - כדי לתקן מוצר שכבר
  // נוצר עם ה-data-URL המקומי, אם "הוסף" נלחץ *לפני* שההעלאה הספיקה
  // להסתיים (אחרת onChange כבר היה מעדכן את value לכתובת האמיתית). ראו
  // useProductForm.ts (pendingImageUploadRef) + useAddProduct.ts.
  onUploadStart?: (promise: Promise<string | null>) => void;
}

export const ProductImageField = memo(({ value, onChange, onUploadStart }: Props) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const ink = isDark ? PAPER_NOTE.inkDark : PAPER_NOTE.inkLight;
  const inputRef = useRef<HTMLInputElement | null>(null);
  // busy = שלב הדחיסה (חוסם, ~שנייה). uploading = העלאה לשרת ברקע
  // (לא חוסם - התמונה כבר מוצגת ושמישה, רק מוחלפת בכתובת מתארחת אם יצליח).
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  // tone מבחין בין כשל חוסם (דחיסה נכשלה/גדול מדי - 'error', אדום) לכשל רך
  // (העלאה לענן נכשלה אבל התמונה המקומית עדיין תקינה ושמישה - 'warning',
  // טון ניטרלי) - אותו state יחיד, לא שני משתנים, כדי שתמיד יתנקה יחד.
  const [error, setError] = useState<{ text: string; tone: 'error' | 'warning' } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  // התמונה השמורה (value) נכשלה לטעון - אין כאן קטגוריה להציג במקומה
  // (זה שדה טופס, לא תצוגת מוצר), אז פלייסהולדר "נכשל לטעון" פשוט בתוך
  // אותה תיבה 78x78. מתאפס כש-value משתנה (הסרה+הוספה מחדש).
  const [imageFailed, setImageFailed] = useState(false);
  const [seenValue, setSeenValue] = useState(value);
  if (value !== seenValue) {
    setSeenValue(value);
    setImageFailed(false);
  }
  // מזהה בקשה - מתעלמים מתוצאה של דחיסה/העלאה שהמשתמש כבר "עקף"
  // (בחר קובץ אחר, או הסיר את התמונה) לפני שהסתיימה.
  const reqIdRef = useRef(0);

  const pick = () => {
    if (busy) return;
    haptic('light');
    setError(null);
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const myId = ++reqIdRef.current;
    setBusy(true);
    setError(null);

    // שלב 1 - דחיסה מקומית. מציגים מיד.
    let local: string;
    try {
      local = await compressProductImage(file);
    } catch (err) {
      if (myId === reqIdRef.current) {
        const code = err instanceof ImageUploadError ? err.code : 'unknown';
        setError({ text: code === 'too-large' ? t('photoTooLarge') : t('photoUploadError'), tone: 'error' });
        haptic('heavy');
        setBusy(false);
      }
      return;
    }
    if (myId !== reqIdRef.current) return;
    onChange(local);
    haptic('medium');
    setBusy(false);

    // שלב 2 - העלאה ברקע. בונים "מאסטר" איכותי *מהקובץ המקורי* (לא מ-local
    // שכבר דחוס אגרסיבית לתצוגה) ומעלים אותו ל-Cloudinary, שגוזר ממנו את
    // כל הגרסאות. אם השרת בלי Cloudinary / כל כשל - נשארים עם ה-data URL.
    // עטוף בפונקציה (במקום קוד ישיר) כדי שאפשר יהיה גם להחזיר את ה-promise
    // שלה להורה (onUploadStart) - ראו ההערה על ה-prop למעלה.
    setUploading(true);
    const runUpload = async (): Promise<string | null> => {
      try {
        const master = await buildUploadMaster(file);
        if (myId !== reqIdRef.current) return null;
        const url = await uploadToServer(master);
        if (myId === reqIdRef.current) {
          // טוענים מראש את גרסת ה-thumb לפני שמחליפים את value - אחרת
          // ProgressiveImage (שמאפס את מצב "נטען" בכל שינוי src) מציג לרגע
          // את שכבת הבלור מעל התמונה החדה שכבר מוצגת, כי ל-URL המקומי (data:)
          // אין בלור בכלל (cldBlur מחזיר undefined) אבל ל-URL של Cloudinary
          // כן - נראה כמו "רפרוש" של התמונה. עם preload, ברגע שה-src מוחלף
          // הדפדפן כבר פענח את הקובץ ו-onLoad יורה כמעט מיידית.
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = cldThumb(url);
          });
          if (myId === reqIdRef.current) onChange(url);
        }
        return url;
      } catch (err) {
        // "לא מוגדר" (503, IMAGE_UPLOAD_NOT_CONFIGURED) - נפילה מכוונת ושקטה
        // לאחסון data-URL, לא באמת "כשל". כל כשל אחר (מכסת Cloudinary נגמרה,
        // רשת נפלה באמצע, חתימה לא תקפה וכו') - שקט לגמרי בפרודקשן עד עכשיו,
        // המשתמש לא ידע שהתמונה לא הגיעה לאחסון קבוע. עדיין לא חוסם: התמונה
        // המקומית כבר מוצגת ותקינה, רק מודיעים.
        if (!isNotConfiguredError(err)) {
          if (import.meta.env.DEV) {
            console.warn('product image server upload failed, keeping local copy', err);
          }
          if (myId === reqIdRef.current) {
            setError({ text: t('photoSyncFailed'), tone: 'warning' });
          }
          if (import.meta.env.PROD) {
            import('@sentry/react').then(Sentry => {
              Sentry.captureException(err, { extra: { context: 'product-image-upload' } });
            }).catch(() => { /* Sentry לא זמין/לא מוגדר - לא קריטי */ });
          }
        }
        return null;
      } finally {
        if (myId === reqIdRef.current) setUploading(false);
      }
    };

    onUploadStart?.(runUpload());
  };

  const remove = () => {
    reqIdRef.current++; // מבטל דחיסה/העלאה שרצה
    setUploading(false);
    setBusy(false);
    haptic('light');
    setError(null);
    onChange('');
  };

  return (
    // תא בעמודת ה-grid (ראו AddProductModal/EditProductModal) - stretch
    // תמיד (לא רק כשיש תמונה) כדי ששני המצבים ייצמדו לאותה קצה קבועה
    // (flex-end בשורה הפנימית למטה) ולא "יקפצו" כשמוסיפים תמונה.
    <Box sx={{ minWidth: 0, justifySelf: 'stretch' }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {value ? (
        // יש תמונה - עמודה: תווית "תמונה:" *מעל* התמונה (שתיהן צמודות
        // לקצה השמאלי של תא ה-grid, alignItems:flex-end ב-RTL). כך התמונה
        // מקבלת את כל רוחב התא ויכולה להיות גדולה יותר. מרובעת, פינות
        // מעוגלות, מסגרת תכלת דקה. כפתור הסרה אדום על הפינה.
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.6 }}>
          <Typography sx={{
            fontSize: 10, fontWeight: 800, color: ink,
            letterSpacing: 1, textTransform: 'uppercase',
          }}>
            {t('photo')}:
          </Typography>
          <Box sx={{ position: 'relative', width: 112, flexShrink: 0 }}>
            <Box
              role="button"
              aria-label={imageFailed ? t('photoLoadFailed') : t('viewPhotoAria')}
              onClick={() => { if (imageFailed) return; haptic('light'); setLightbox(true); }}
              sx={{
                position: 'relative',
                width: 112, height: 112,
                borderRadius: '14px', overflow: 'hidden',
                bgcolor: 'action.hover',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                cursor: imageFailed ? 'default' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'transform 0.15s',
                '&:active': imageFailed ? {} : { transform: 'scale(0.97)' },
              }}
            >
              {imageFailed ? (
                // פלייסהולדר "נכשל לטעון" - אין כאן קטגוריה כמו בתצוגות
                // אחרות של המוצר, זה שדה טופס. כפתור ההסרה (מחוץ לתיבה
                // הזו) עדיין עובד - המשתמש לא תקוע, יכול להסיר ולנסות שוב.
                <Box sx={{
                  width: '100%', height: '100%',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.4,
                  color: 'text.disabled',
                }}>
                  <BrokenImageRoundedIcon sx={{ fontSize: 26 }} />
                  <Typography sx={{ fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.15, px: 0.5 }}>
                    {t('photoLoadFailed')}
                  </Typography>
                </Box>
              ) : (
                <ProgressiveImage src={cldThumb(value)} blurSrc={cldBlur(value)} alt={t('photo')} onError={() => setImageFailed(true)} />
              )}
              {/* מסגרת תכלת דקה מעל התמונה */}
              <Box aria-hidden="true" sx={{
                position: 'absolute', inset: 0, borderRadius: '14px',
                border: '1.5px solid',
                borderColor: isDark ? PAPER_NOTE.frameDark : PAPER_NOTE.frameLight,
                pointerEvents: 'none',
              }} />
              {uploading && (
                // חיווי העלאה - "מים" בגוון תכלת המותג שעולים מלמטה למעלה
                // וחוזרים, בלי ספינר ובלי טקסט. חצי-שקוף כדי שרואים את
                // התמונה שמאחור (מה שמעלים). קו "פני המים" בהיר בקצה העליון.
                <Box role="status" aria-label={t('photoProcessing')} sx={{
                  position: 'absolute', left: 0, right: 0, bottom: 0,
                  overflow: 'hidden',
                  animation: 'sbUploadRise 1.5s ease-in-out infinite',
                  '@keyframes sbUploadRise': {
                    '0%, 100%': { height: '10%' },
                    '50%': { height: '100%' },
                  },
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none', height: '55%' },
                  bgcolor: 'rgba(20,184,166,0.42)',
                  '&::before': {
                    content: '""', position: 'absolute', left: 0, right: 0, top: 0, height: 2,
                    bgcolor: 'rgba(94,234,212,0.95)',
                  },
                }} />
              )}
            </Box>
            {/* כפתור הסרה - עיגול אדום בפינה הימנית-עליונה (הפיזית), מבצבץ
                החוצה מהתמונה. עבר מהפינה השמאלית כי שם עכשיו יושבת תווית
                "תמונה:" (מעל התמונה, מיושרת שמאל). */}
            <Box
              role="button"
              aria-label={t('removePhoto')}
              onClick={remove}
              sx={{
                position: 'absolute', top: -8, right: -8,
                width: 24, height: 24, borderRadius: '50%',
                bgcolor: '#DC2626', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                '&:active': { transform: 'scale(0.9)' },
              }}
            >
              <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />
            </Box>
          </Box>
        </Box>
      ) : (
        // אין תמונה - צ'יפ צמוד לאותו קצה (השמאלי ב-RTL) שהתמונה תתפוס
        // ברגע שתיבחר, כדי שלא "יקפוץ" הצידה כשמוסיפים תמונה בפועל.
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <Box
            role="button"
            tabIndex={0}
            aria-label={t('addPhoto')}
            onClick={pick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') pick(); }}
            sx={{
              ...addChipSx(isDark),
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.75 : 1,
              ...(busy ? { '&:hover': {} } : {}),
            }}
          >
            {busy ? (
              <CircularProgress size={13} sx={{ color: ink }} />
            ) : (
              <AddPhotoAlternateRoundedIcon sx={{ fontSize: 16 }} />
            )}
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, fontStyle: 'italic' }}>
              {busy ? t('photoProcessing') : t('addPhoto')}
            </Typography>
          </Box>
        </Box>
      )}

      {error && (
        <Typography sx={{
          fontSize: 11.5, mt: 0.6, px: 0.25,
          // warning (העלאה לענן נכשלה, לא חוסם) - טון ניטרלי, לא אדום כמו
          // כשל חוסם אמיתי (too-large/decode) - זה לא מצריך פעולה מהמשתמש.
          color: error.tone === 'warning' ? 'text.secondary' : '#DC2626',
        }}>
          {error.text}
        </Typography>
      )}

      {lightbox && value && (
        <ImageLightbox src={cldFull(value)} alt={t('photo')} onClose={() => setLightbox(false)} />
      )}
    </Box>
  );
});
ProductImageField.displayName = 'ProductImageField';
