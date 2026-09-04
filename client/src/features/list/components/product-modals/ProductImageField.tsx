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
    // flexBasis: כשאין תמונה - צ'יפ צר שיושב בשורה אחת ליד "הוסף הערה";
    // כשיש תמונה (תצוגה מקדימה) - תופס שורה מלאה.
    <Box sx={{ flexBasis: value ? '100%' : 'auto', flexGrow: 0, minWidth: 0 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {value ? (
        // יש תמונה - תצוגה מקדימה ממוסגרת. הקשה = מסך מלא. כפתור הסרה
        // (אייקון פח אדום) יושב צמוד לתמונה.
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            role="button"
            aria-label={t('viewPhotoAria')}
            onClick={() => { haptic('light'); setLightbox(true); }}
            sx={{
              position: 'relative',
              width: 72, height: 72, flexShrink: 0,
              borderRadius: '10px', overflow: 'hidden',
              boxShadow: '0 1.5px 5px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              transform: 'rotate(-1.2deg)',
              WebkitTapHighlightColor: 'transparent',
              '&:active': { transform: 'rotate(-0.6deg) scale(0.97)' },
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
          <Box
            role="button"
            aria-label={t('removePhoto')}
            onClick={remove}
            sx={{
              flexShrink: 0,
              width: 32, height: 32, borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#DC2626',
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              transition: 'background-color 0.15s',
              '&:hover': { bgcolor: 'rgba(239,68,68,0.12)' },
              '&:active': { bgcolor: 'rgba(239,68,68,0.2)' },
            }}
          >
            <DeleteOutlineRoundedIcon sx={{ fontSize: 19 }} />
          </Box>
          <Typography sx={{
            flex: 1, minWidth: 0,
            fontSize: 10, fontWeight: 800, color: ink,
            letterSpacing: 1, textTransform: 'uppercase',
          }}>
            {t('photo')}
          </Typography>
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
