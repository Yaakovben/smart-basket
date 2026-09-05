import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { haptic } from '../helpers';
import { useSettings } from '../context/SettingsContext';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

// מציג תמונה בודדת במסך מלא מעל שאר האפליקציה. הקשה על הרקע או על ה-X
// סוגרת, וגם Escape. לא Dialog של MUI בכוונה - זה פותח מעל מודאלים
// קיימים (פרטי מוצר) בלי להתנגש בנעילת גלילה / z-index שלהם.
export const ImageLightbox = ({ src, alt, onClose }: ImageLightboxProps) => {
  const { t } = useSettings();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const close = () => { haptic('light'); onClose(); };

  // portal ל-body: המודאלים של MUI משאירים transform inline על ה-Paper אחרי
  // אנימציית הכניסה, מה שהופך position:fixed לביחס ל-Paper ולא לviewport.
  return createPortal(
    <Box
      role="dialog"
      aria-modal="true"
      onClick={close}
      sx={{
        position: 'fixed', inset: 0, zIndex: 2000,
        bgcolor: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        p: 2,
        animation: 'lightboxIn 0.15s ease-out',
        '@keyframes lightboxIn': { from: { opacity: 0 }, to: { opacity: 1 } },
      }}
    >
      <IconButton
        onClick={(e) => { e.stopPropagation(); close(); }}
        aria-label={t('closePhotoAria')}
        sx={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top) + 8px)', insetInlineEnd: 8,
          bgcolor: 'rgba(255,255,255,0.14)', color: '#fff',
          width: 44, height: 44,
          '&:hover': { bgcolor: 'rgba(255,255,255,0.24)' },
        }}
      >
        <CloseIcon />
      </IconButton>
      <Box
        component="img"
        src={src}
        alt={alt || t('photo')}
        fetchPriority="high"
        decoding="async"
        onClick={(e) => e.stopPropagation()}
        sx={{
          maxWidth: '100%', maxHeight: '100%',
          objectFit: 'contain',
          borderRadius: '8px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
      />
    </Box>,
    document.body,
  );
};
