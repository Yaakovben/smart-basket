import { memo, useRef, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { haptic } from '../../../../global/helpers';
import { PHOTO_ACCENT } from '../../helpers/paperNote';
import { useSettings } from '../../../../global/context/SettingsContext';
import { ImageLightbox } from '../../../../global/components';
import { uploadProductImage, ImageUploadError } from '../../../../global/services/imageUpload';

// ===== שדה תמונת מוצר - משותף ל-Add ול-Edit =====
// אותה *צורה* כמו הצ'יפ "הוסף הערה" (פינה מקופלת, אייקון, "+"), אבל בצבע
// סגול (PHOTO_ACCENT) כדי להבדיל תמונה מהערה ולא להטביע הכל בתכלת.
export const ProductImageField = memo(({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const accent = isDark ? PHOTO_ACCENT.inkDark : PHOTO_ACCENT.inkLight;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);

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
    setBusy(true);
    setError(null);
    try {
      const stored = await uploadProductImage(file);
      onChange(stored);
      haptic('medium');
    } catch (err) {
      const code = err instanceof ImageUploadError ? err.code : 'unknown';
      setError(code === 'too-large' ? t('photoTooLarge') : t('photoUploadError'));
      haptic('heavy');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
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
            {/* מסגרת סגולה דקה - מצוירת מעל התמונה */}
            <Box aria-hidden="true" sx={{
              position: 'absolute', inset: 0, borderRadius: '10px',
              border: '1.5px solid',
              borderColor: isDark ? PHOTO_ACCENT.ringDark : PHOTO_ACCENT.ringLight,
              pointerEvents: 'none',
            }} />
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
            fontSize: 10, fontWeight: 800, color: accent,
            letterSpacing: 1, textTransform: 'uppercase',
          }}>
            {t('photo')}
          </Typography>
        </Box>
      ) : (
        // אין תמונה - צ'יפ באותה צורה כמו "הוסף הערה", אבל בסגול (PHOTO_ACCENT)
        <Box
          role="button"
          tabIndex={0}
          aria-label={t('addPhoto')}
          onClick={pick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') pick(); }}
          sx={{
            position: 'relative',
            display: 'inline-flex', alignItems: 'center', gap: 0.6,
            py: 0.55, pl: 1.1, pr: 1.4,
            cursor: busy ? 'default' : 'pointer', userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            color: accent,
            bgcolor: isDark ? PHOTO_ACCENT.chipBgDark : PHOTO_ACCENT.chipBgLight,
            transform: 'rotate(-1.2deg)',
            boxShadow: '0 1.5px 4px rgba(139,92,246,0.18)',
            transition: 'all 0.18s',
            clipPath: 'polygon(7px 0, 100% 0, 100% 100%, 0 100%, 0 7px)',
            opacity: busy ? 0.75 : 1,
            '&:hover': busy ? {} : { transform: 'rotate(-0.6deg) translateY(-1px)' },
          }}
        >
          {busy ? (
            <CircularProgress size={13} sx={{ color: accent }} />
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
              bgcolor: isDark ? PHOTO_ACCENT.inkDark : PHOTO_ACCENT.inkLight,
              color: isDark ? '#1e1b4b' : '#fff',
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
