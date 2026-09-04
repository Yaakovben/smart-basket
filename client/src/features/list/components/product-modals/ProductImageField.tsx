import { memo, useRef, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { haptic } from '../../../../global/helpers';
import { PAPER_NOTE, addChipSx } from '../../helpers/paperNote';
import { useSettings } from '../../../../global/context/SettingsContext';
import { ImageLightbox } from '../../../../global/components';
import { compressProductImage, uploadToServer, isNotConfiguredError, ImageUploadError } from '../../../../global/services/imageUpload';

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

    // שלב 2 - העלאה לשרת ברקע. אם מצליח, מחליפים ל-URL קצר. אם השרת בלי
    // Cloudinary (או כל כשל) - נשארים עם ה-data URL שכבר נשמר, בשקט.
    setUploading(true);
    try {
      const url = await uploadToServer(local);
      if (myId === reqIdRef.current) onChange(url);
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
    // תמיד flexBasis:auto - גם צ'יפ "הוסף תמונה" וגם התצוגה המקדימה
    // צרים מספיק לשבת ליד ההערה, לא מתחתיה.
    <Box sx={{ flexBasis: 'auto', flexGrow: 0, minWidth: 0 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {value ? (
        // יש תמונה - תצוגה מקדימה קומפקטית: תווית "תמונה" למעלה (כמו
        // תווית "הערה" בפתק), התמונה מתחת, וכפתור הסרה אדום על פינתה.
        <Box sx={{ display: 'inline-flex', flexDirection: 'column', gap: 0.4 }}>
          <Typography sx={{
            fontSize: 10, fontWeight: 800, color: ink,
            letterSpacing: 1, textTransform: 'uppercase', px: 0.25,
          }}>
            {t('photo')}
          </Typography>
          <Box sx={{ position: 'relative', width: 76, height: 76, transform: 'rotate(-1.2deg)' }}>
            <Box
              role="button"
              aria-label={t('viewPhotoAria')}
              onClick={() => { haptic('light'); setLightbox(true); }}
              sx={{
                position: 'relative',
                width: '100%', height: '100%',
                borderRadius: '10px', overflow: 'hidden',
                boxShadow: '0 1.5px 5px rgba(0,0,0,0.12)',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              <Box component="img" src={value} alt={t('photo')} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {/* מסגרת תכלת דקה - מצוירת מעל התמונה */}
              <Box aria-hidden="true" sx={{
                position: 'absolute', inset: 0, borderRadius: '10px',
                border: '1.5px solid',
                borderColor: isDark ? PAPER_NOTE.frameDark : PAPER_NOTE.frameLight,
                pointerEvents: 'none',
              }} />
              {/* העלאה לשרת ברקע - חיווי עדין, לא חוסם. התמונה כבר שמישה. */}
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
            {/* כפתור הסרה - עיגול אדום על הפינה */}
            <Box
              role="button"
              aria-label={t('removePhoto')}
              onClick={remove}
              sx={{
                position: 'absolute', top: -7, insetInlineStart: -7,
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
        // אין תמונה - צ'יפ פתק מקופל (addChipSx - זהה לחלוטין ל"הוסף הערה")
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
            <PhotoCameraRoundedIcon sx={{ fontSize: 15 }} />
          )}
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, fontStyle: 'italic' }}>
            {busy ? t('photoProcessing') : t('addPhoto')}
          </Typography>
          {!busy && (
            <Box sx={{
              width: 14, height: 14, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: ink, color: isDark ? '#0b1220' : '#fff',
              fontSize: 11, fontWeight: 800, lineHeight: 1,
            }}>+</Box>
          )}
        </Box>
      )}

      {error && (
        <Typography sx={{ fontSize: 11.5, color: '#DC2626', mt: 0.6, px: 0.25 }}>
          {error}
        </Typography>
      )}

      {lightbox && value && (
        <ImageLightbox src={value} alt={t('photo')} onClose={() => setLightbox(false)} />
      )}
    </Box>
  );
});
ProductImageField.displayName = 'ProductImageField';
