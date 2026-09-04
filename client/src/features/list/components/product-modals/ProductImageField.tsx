import { memo, useRef, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import { haptic } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';
import { ImageLightbox } from '../../../../global/components';
import { uploadProductImage, ImageUploadError } from '../../../../global/services/imageUpload';

// ===== שדה תמונת מוצר - משותף ל-Add ול-Edit =====
// אותה שפה ויזואלית כמו ProductNoteField (צ'יפ תורכיז נטוי במצב סגור),
// אבל כאן במקום טקסט - צילום/בחירת תמונה, דחיסה+העלאה (ImageService),
// ותצוגה מקדימה עם הסרה. הקשה על התצוגה המקדימה פותחת את התמונה במסך מלא.
export const ProductImageField = memo(({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const { t } = useSettings();
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
        // יש תמונה - תצוגה מקדימה ממוסגרת עם כפתור הסרה. הקשה = מסך מלא.
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            role="button"
            aria-label={t('viewPhotoAria')}
            onClick={() => { haptic('light'); setLightbox(true); }}
            sx={{
              position: 'relative',
              width: 72, height: 72, flexShrink: 0,
              borderRadius: '12px', overflow: 'hidden',
              border: '1px solid rgba(20,184,166,0.3)',
              boxShadow: '0 1.5px 4px rgba(20,184,166,0.18)',
              cursor: 'pointer',
              transform: 'rotate(-1.2deg)',
              WebkitTapHighlightColor: 'transparent',
              '&:active': { transform: 'rotate(-0.6deg) scale(0.97)' },
            }}
          >
            <Box component="img" src={value} alt={t('photo')} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#0F766E', letterSpacing: 1, textTransform: 'uppercase' }}>
              {t('photo')}
            </Typography>
            <Box
              role="button"
              onClick={remove}
              sx={{
                mt: 0.4, display: 'inline-flex', alignItems: 'center', gap: 0.4,
                px: 0.9, py: 0.3, borderRadius: '999px',
                bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)',
                color: '#DC2626', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent',
                '&:hover': { bgcolor: 'rgba(239,68,68,0.14)' },
              }}
            >
              ✕ {t('removePhoto')}
            </Box>
          </Box>
        </Box>
      ) : (
        // אין תמונה - צ'יפ נטוי, תואם למצב הסגור של ProductNoteField
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
            color: '#0D9488', bgcolor: '#E0F7F4',
            transform: 'rotate(-1.2deg)',
            boxShadow: '0 1.5px 4px rgba(20,184,166,0.18)',
            transition: 'all 0.18s',
            clipPath: 'polygon(7px 0, 100% 0, 100% 100%, 0 100%, 0 7px)',
            opacity: busy ? 0.75 : 1,
            '&:hover': busy ? {} : { bgcolor: '#CCF1EC', transform: 'rotate(-0.6deg) translateY(-1px)' },
          }}
        >
          {busy ? (
            <CircularProgress size={13} sx={{ color: '#0D9488' }} />
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
              bgcolor: '#0D9488', color: '#fff', fontSize: 11, fontWeight: 800, lineHeight: 1,
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
