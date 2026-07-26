import { memo, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Avatar, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { List, Product } from '../../../../global/types';
import { COMMON_STYLES, generateShareListMessage, BRAND_COLORS } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';
import { trackEvent } from '../../../../global/services/analytics';
import { modalOverlaySx, modalContainerSx } from '../../helpers/listModalStyles';
import { WhatsAppIcon } from './WhatsAppIcon';
import { PrintListView } from './PrintListView';

// ===== מודאל שיתוף רשימה =====
interface ShareListModalProps {
  isOpen: boolean;
  list: List;
  pendingProducts: Product[];
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const ShareListModal = memo(({
  isOpen,
  list,
  pendingProducts,
  onClose,
  showToast
}: ShareListModalProps) => {
  const { t } = useSettings();

  // מניעת גלילת רקע כשמודאל פתוח
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(generateShareListMessage(list, t))
      .then(() => { trackEvent('list_shared', { channel: 'copy' }); showToast(t('copied')); onClose(); })
      .catch(() => showToast(t('copyError')));
  };

  // ייצוא/שיתוף כ-PDF: מסתמך על דיאלוג ההדפסה של הדפדפן (window.print) על
  // PrintListView שמעוצב ייעודית להדפסה - בלי להוסיף ספריית PDF לבאנדל.
  // window.print() חייב להיות הפעולה הראשונה בתוך handler הקליק, לפני כל
  // קריאה אחרת (גם קריאה סינכרונית תמימה כמו trackEvent) - חלק מהדפדפנים/
  // דפדפני PWA מזהים "פעולה יזומה ע"י משתמש" רק אם אין שום דבר לפניה,
  // ואחרת עלולים לחסום אותה בדיוק כמו שחוסמים חלון קופץ (popup).
  const handlePrint = () => {
    window.print();
    trackEvent('list_shared', { channel: 'pdf' });
  };

  return (
    <>
      <Box sx={modalOverlaySx} onClick={onClose} aria-hidden="true" />
      <Box sx={modalContainerSx} role="dialog" aria-labelledby="share-title">
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', top: 12, left: 12, bgcolor: 'action.hover' }}
          size="small"
          aria-label={t('close')}
        >
          <CloseIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        </IconButton>
        <Box sx={{ textAlign: 'center', mb: 2.5 }}>
          <Avatar sx={{ width: 64, height: 64, background: COMMON_STYLES.gradients.header, mx: 'auto', mb: 2, boxShadow: '0 8px 24px rgba(20,184,166,0.3)' }}>
            <ShareIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Typography id="share-title" sx={{ fontSize: 20, fontWeight: 700, color: 'text.primary' }}>{t('shareList')}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{t('shareListDescription')}</Typography>
        </Box>
        <Box sx={{ bgcolor: 'rgba(20, 184, 166, 0.06)', borderRadius: '12px', border: '1.5px solid', borderColor: 'rgba(20, 184, 166, 0.3)', mb: 2.5, overflow: 'hidden' }}>
          <Box sx={{ p: '12px 16px', borderBottom: '1px solid', borderColor: 'rgba(20, 184, 166, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'primary.main' }}>{list.name}</Typography>
            <Chip label={`${pendingProducts.length} ${t('items')}`} size="small" sx={{ bgcolor: 'transparent', color: 'primary.main', fontWeight: 500 }} />
          </Box>
          <Box sx={{ p: '12px 16px', maxHeight: 140, overflow: 'auto' }}>
            {pendingProducts.length === 0 ? (
              <Typography sx={{ color: 'text.secondary', fontSize: 14, textAlign: 'center', py: 1 }}>{t('noProducts')}</Typography>
            ) : (
              pendingProducts.slice(0, 5).map((p, i) => (
                <Box
                  key={p.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 0.75,
                    borderBottom: i < Math.min(pendingProducts.length, 5) - 1 ? '1px solid' : 'none',
                    borderColor: 'rgba(20, 184, 166, 0.2)'
                  }}
                >
                  <Typography sx={{ fontSize: 14, color: 'primary.main' }}>• {p.name}</Typography>
                  <Typography sx={{ fontSize: 13, color: 'primary.main' }}>{p.quantity} {p.unit}</Typography>
                </Box>
              ))
            )}
            {pendingProducts.length > 5 && (
              <Typography sx={{ fontSize: 13, color: 'primary.main', textAlign: 'center', pt: 1 }}>
                + {pendingProducts.length - 5} {t('items')}
              </Typography>
            )}
          </Box>
        </Box>
        <Button
          onClick={() => {
            const message = generateShareListMessage(list, t);
            // window.open לפני trackEvent - מאותה סיבה כמו ב-handlePrint, למנוע חסימת popup-blocker
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
            trackEvent('list_shared', { channel: 'whatsapp' });
          }}
          fullWidth
          sx={{
            bgcolor: BRAND_COLORS.whatsapp, color: 'white',
            '&:hover': { bgcolor: BRAND_COLORS.whatsappHover },
            gap: 1, py: 1.5, fontSize: 16,
          }}
          aria-label="WhatsApp"
        >
          <WhatsAppIcon />
        </Button>
        <Box sx={{ display: 'flex', gap: 1.25, mt: 1.25 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={handleCopy}
            aria-label={t('copy')}
            startIcon={<ContentCopyIcon />}
            // אייקון בגודל קבוע 20x20 בכל המכשירים (אחיד עם PDF)
            sx={{ gap: 1, '& .MuiButton-startIcon': { marginInlineStart: 0, marginInlineEnd: '8px', '& svg': { width: 20, height: 20, fontSize: 20 } } }}
          >
            {t('copy')}
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={handlePrint}
            startIcon={<PictureAsPdfIcon />}
            aria-label={t('exportPdf')}
            // אייקון בגודל קבוע 20x20 בכל המכשירים (אחיד עם כפתור ההעתקה)
            sx={{ gap: 1, '& .MuiButton-startIcon': { marginInlineStart: 0, marginInlineEnd: '8px', '& svg': { width: 20, height: 20, fontSize: 20 } } }}
          >
            {t('exportPdf')}
          </Button>
        </Box>
      </Box>
      <PrintListView list={list} pendingProducts={pendingProducts} />
    </>
  );
});

ShareListModal.displayName = 'ShareListModal';
