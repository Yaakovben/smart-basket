import { memo, useEffect, useState } from 'react';
import { Box, Typography, Button, IconButton, Avatar, Chip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { List, Product } from '../../../../global/types';
import { COMMON_STYLES, generateShareListMessage, BRAND_COLORS } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';
import { trackEvent } from '../../../../global/services/analytics';
import { modalOverlaySx, modalContainerSx } from '../../helpers/listModalStyles';
import { WhatsAppIcon } from './WhatsAppIcon';
import { PrintListView } from './PrintListView';
import { generateListPdf } from './generateListPdf';

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
  // תפריט "עוד" (העתק/PDF) - נפתח מכפתור שלוש הנקודות ליד כפתור הוואטסאפ
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<HTMLElement | null>(null);

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
    setMoreMenuAnchor(null);
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
  //
  // iOS Safari (בעיקר כ-PWA מותקן) חוסם את window.print() לגמרי עם הודעת
  // "האפשרות להדפיס באופן אוטומטי נחסמה" - זו לא בעיית תזמון בקוד, זו
  // מגבלת פלטפורמה בלי דרך לעקוף אותה. לכן ב-iOS מייצרים קובץ PDF אמיתי
  // בצד הלקוח (צילום ה-DOM של PrintListView, ראו generateListPdf.ts) ומשתפים
  // אותו כקובץ דרך ה-Share Sheet - בלי לגעת בזרימת window.print() הקיימת
  // שכבר עובדת בכרום/אנדרואיד.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const handlePrint = () => {
    if (isIOS) {
      setMoreMenuAnchor(null);
      trackEvent('list_shared', { channel: 'pdf_ios' });
      generateListPdf(list.name, t('preparingPdf'))
        .then(async (pdfFile) => {
          if (pdfFile && navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
            try {
              await navigator.share({ files: [pdfFile], title: list.name });
              return;
            } catch (err) {
              // AbortError = המשתמש ביטל בכוונה, לא נופלים לשום דבר אחר.
              if ((err as DOMException)?.name === 'AbortError') return;
              // כשלון אחר (למשל iOS חסם את הקריאה בגלל זמן העיבוד) - נופלים
              // להורדה ישירה כדי שהמשתמש עדיין יקבל את הקובץ בפועל.
            }
            const url = URL.createObjectURL(pdfFile);
            const a = document.createElement('a');
            a.href = url;
            a.download = pdfFile.name;
            a.click();
            URL.revokeObjectURL(url);
            return;
          }
          // אין תמיכה בשיתוף קבצים, או שיצירת ה-PDF נכשלה - חזרה לטקסט רגיל.
          if (navigator.share) {
            await navigator.share({ text: generateShareListMessage(list, t) }).catch(() => {});
          }
        })
        .catch(() => showToast(t('errorOccurred')));
      return;
    }
    window.print();
    trackEvent('list_shared', { channel: 'pdf' });
    setMoreMenuAnchor(null);
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
          <Avatar sx={{ width: 64, height: 64, background: COMMON_STYLES.gradients.header.light, mx: 'auto', mb: 2, boxShadow: '0 8px 24px rgba(20,184,166,0.3)' }}>
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
        <Box sx={{ display: 'flex', gap: 1.25 }}>
          <Button
            onClick={() => {
              const message = generateShareListMessage(list, t);
              // window.open לפני trackEvent - מאותה סיבה כמו ב-handlePrint, למנוע חסימת popup-blocker
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
              trackEvent('list_shared', { channel: 'whatsapp' });
            }}
            sx={{
              flex: 1,
              bgcolor: BRAND_COLORS.whatsapp, color: 'white',
              '&:hover': { bgcolor: BRAND_COLORS.whatsappHover },
              gap: 1, py: 1.5, fontSize: 16,
            }}
            aria-label="WhatsApp"
          >
            <WhatsAppIcon size={23} />
          </Button>
          <Button
            variant="outlined"
            onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
            aria-label={t('moreOptionsAria')}
            sx={{ flex: '0 0 auto', minWidth: 0, width: 52, py: 1.5, px: 0 }}
          >
            <MoreVertIcon />
          </Button>
        </Box>
        <Menu
          anchorEl={moreMenuAnchor}
          open={!!moreMenuAnchor}
          onClose={() => setMoreMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <MenuItem onClick={handleCopy}>
            <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('copyList')}</ListItemText>
          </MenuItem>
          <MenuItem onClick={handlePrint}>
            <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('sharePdf')}</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
      <PrintListView list={list} pendingProducts={pendingProducts} />
    </>
  );
});

ShareListModal.displayName = 'ShareListModal';
