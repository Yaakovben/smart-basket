import { memo, useRef, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { haptic } from '../../../../global/helpers';
import { cldThumb, cldFull, cldBlur } from '../../../../global/helpers/cloudinaryImage';
import { PAPER_NOTE, addChipSx } from '../../helpers/paperNote';
import { useSettings } from '../../../../global/context/SettingsContext';
import { ImageLightbox, ProgressiveImage } from '../../../../global/components';
import { compressProductImage, buildUploadMaster, uploadToServer, isNotConfiguredError, ImageUploadError } from '../../../../global/services/imageUpload';

// ===== שדה תמונת מוצר - משותף ל-Add ול-Edit =====
// עיצוב אחיד לחלוטין עם ProductNoteField: אותו צ'יפ תכלת סגור, אותם
// גוונים (PAPER_NOTE), אותה מסגרת נייר. הערה ותמונה = אותה שפה, אותו צבע.
export const ProductImageField = memo(({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const ink = isDark ? PAPER_NOTE.inkDark : PAPER_NOTE.inkLight;
  const inputRef = useRef<HTMLInputElement | null>(null);
  // busy = שלב הדחיסה (חוסם, ~שנייה). uploading = העלאה לשרת ברקע
  // (לא חוסם - התמונה כבר מוצגת ושמישה, רק מוחלפת בכתובת מתארחת אם יצליח).
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);
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
        setError(code === 'too-large' ? t('photoTooLarge') : t('photoUploadError'));
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
    setUploading(true);
    try {
      const master = await buildUploadMaster(file);
      if (myId !== reqIdRef.current) return;
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
    } catch (err) {
      if (!isNotConfiguredError(err) && import.meta.env.DEV) {
        console.warn('product image server upload failed, keeping local copy', err);
      }
    } finally {
      if (myId === reqIdRef.current) setUploading(false);
    }
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
        // יש תמונה - שורה: התמונה נדחקת עד קצה שמאל של העמודה
        // (justifyContent flex-end = שמאל ב-RTL), ותווית "תמונה:" מימינה.
        // התמונה עצמה: מרובעת, פינות מעוגלות אחידות, מסגרת תכלת דקה
        // (עקבי עם SwipeItem / ProductDetailsModal). כפתור הסרה אדום על הפינה.
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
          <Typography sx={{
            fontSize: 11, fontWeight: 700, color: ink,
            letterSpacing: 0.3, whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {t('photo')}:
          </Typography>
          <Box sx={{ position: 'relative', width: 78, flexShrink: 0 }}>
            <Box
              role="button"
              aria-label={t('viewPhotoAria')}
              onClick={() => { haptic('light'); setLightbox(true); }}
              sx={{
                position: 'relative',
                width: 78, height: 78,
                borderRadius: '13px', overflow: 'hidden',
                bgcolor: 'action.hover',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'transform 0.15s',
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              <ProgressiveImage src={cldThumb(value)} blurSrc={cldBlur(value)} alt={t('photo')} />
              {/* מסגרת תכלת דקה מעל התמונה */}
              <Box aria-hidden="true" sx={{
                position: 'absolute', inset: 0, borderRadius: '13px',
                border: '1.5px solid',
                borderColor: isDark ? PAPER_NOTE.frameDark : PAPER_NOTE.frameLight,
                pointerEvents: 'none',
              }} />
              {uploading && (
                <Box aria-hidden="true" sx={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: 'rgba(0,0,0,0.32)',
                }}>
                  <CircularProgress size={18} sx={{ color: '#fff' }} />
                </Box>
              )}
            </Box>
            {/* כפתור הסרה - עיגול אדום בפינה השמאלית-עליונה (הפיזית),
                מבצבץ החוצה מהתווית "תמונה:" שמימין. */}
            <Box
              role="button"
              aria-label={t('removePhoto')}
              onClick={remove}
              sx={{
                position: 'absolute', top: -7, left: -7,
                width: 22, height: 22, borderRadius: '50%',
                bgcolor: '#DC2626', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                '&:active': { transform: 'scale(0.9)' },
              }}
            >
              <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
            </Box>
          </Box>
        </Box>
      ) : (
        // אין תמונה - אותה שורה (justifyContent:'flex-end') כמו מצב "יש
        // תמונה" למעלה, כדי שהצ'יפ יישב כבר עכשיו באותה קצה שהתמונה תתפוס
        // ברגע שתיבחר - בלי זה הצ'יפ ישב במרכז/התחלה ואז "יקפוץ" שמאלה
        // כשמוסיפים תמונה בפועל.
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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
        <Typography sx={{ fontSize: 11.5, color: '#DC2626', mt: 0.6, px: 0.25 }}>
          {error}
        </Typography>
      )}

      {lightbox && value && (
        <ImageLightbox src={cldFull(value)} alt={t('photo')} onClose={() => setLightbox(false)} />
      )}
    </Box>
  );
});
ProductImageField.displayName = 'ProductImageField';
