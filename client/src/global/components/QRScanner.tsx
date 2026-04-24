import { useEffect, useRef, useState } from 'react';
import { Dialog, Box, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { Html5Qrcode } from 'html5-qrcode';
import { haptic } from '../helpers';

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}

/**
 * סורק QR מובנה באפליקציה. מבקש הרשאת מצלמה ומחזיר את הטקסט שסרק דרך onScan.
 * שימוש בספריית html5-qrcode. מזהה QR אוטומטית; המצלמה נסגרת מיד בסריקה הראשונה.
 */
export const QRScanner = ({ open, onClose, onScan }: QRScannerProps) => {
  const containerId = 'qr-scanner-container';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const start = async () => {
      setError(null);
      setStarting(true);
      try {
        const instance = new Html5Qrcode(containerId);
        scannerRef.current = instance;
        await instance.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (cancelled) return;
            haptic('medium');
            onScan(decoded);
            // עצירה מיידית כדי שלא ייקרא שוב; ה-onClose עושה cleanup מלא
            instance.stop().catch(() => {});
          },
          () => { /* decode failure - מתעלמים, זה רגיל בין פריימים */ },
        );
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'לא ניתן לפתוח את המצלמה';
        setError(msg.includes('Permission') || msg.includes('NotAllowed')
          ? 'הגישה למצלמה נחסמה. אפשר הרשאה בהגדרות הדפדפן ונסה שוב.'
          : 'לא ניתן לפתוח את המצלמה. ודא שיש הרשאה ושמצלמה זמינה.');
      } finally {
        if (!cancelled) setStarting(false);
      }
    };
    start();

    return () => {
      cancelled = true;
      const inst = scannerRef.current;
      scannerRef.current = null;
      if (inst) {
        inst.stop().catch(() => {}).then(() => {
          try { inst.clear(); } catch { /* ignore */ }
        });
      }
    };
  }, [open, onScan]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { bgcolor: '#000' } }}
    >
      <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.5,
          bgcolor: 'rgba(0,0,0,0.6)',
          color: 'white',
          zIndex: 2,
        }}>
          <IconButton onClick={onClose} aria-label="סגור" sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeScannerIcon />
            <Typography sx={{ fontWeight: 700 }}>סרוק QR</Typography>
          </Box>
          <Box sx={{ width: 40 }} />
        </Box>

        {/* תצוגת המצלמה */}
        <Box sx={{ flex: 1, position: 'relative', bgcolor: '#000' }}>
          <Box
            id={containerId}
            sx={{
              width: '100%', height: '100%',
              '& video': {
                width: '100% !important',
                height: '100% !important',
                objectFit: 'cover',
              },
            }}
          />
          {/* הוראות על המסך */}
          {!error && (
            <Box sx={{
              position: 'absolute', bottom: 40, left: 0, right: 0,
              textAlign: 'center',
              px: 3,
              color: 'white',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}>
              <Typography sx={{ fontSize: 15, fontWeight: 600 }}>
                {starting ? 'פותח את המצלמה...' : 'כוון את ה-QR למרכז המסך'}
              </Typography>
            </Box>
          )}
          {/* שגיאה */}
          {error && (
            <Box sx={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 2, p: 3,
              bgcolor: 'rgba(0,0,0,0.85)',
            }}>
              <Typography sx={{ color: 'white', fontSize: 15, textAlign: 'center', maxWidth: 320 }}>
                {error}
              </Typography>
              <Button variant="contained" onClick={onClose}>סגור</Button>
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  );
};
