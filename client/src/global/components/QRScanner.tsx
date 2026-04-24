import { useEffect, useRef, useState } from 'react';
import { Dialog, Box, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { BrowserQRCodeReader } from '@zxing/browser';
import { haptic } from '../helpers';

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}

/**
 * סורק QR מובנה באפליקציה. מבוסס על @zxing/browser (קל משמעותית מ-html5-qrcode).
 * מבקש הרשאת מצלמה, ומאפשר גם לבחור תמונה מהגלריה אם ה-QR התקבל כקובץ.
 */
export const QRScanner = ({ open, onClose, onScan }: QRScannerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [fileScanError, setFileScanError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const start = async () => {
      setError(null);
      setStarting(true);
      try {
        const reader = new BrowserQRCodeReader();
        const video = videoRef.current;
        if (!video) throw new Error('video element missing');

        const controls = await reader.decodeFromVideoDevice(undefined, video, (result, _err, c) => {
          if (cancelled) return;
          if (result) {
            haptic('medium');
            c.stop();
            onScan(result.getText());
          }
        });
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'לא ניתן לפתוח את המצלמה';
        setError(/Permission|NotAllowed/i.test(msg)
          ? 'הגישה למצלמה נחסמה. אפשר הרשאה בהגדרות הדפדפן ונסה שוב.'
          : 'לא ניתן לפתוח את המצלמה. ודא שיש הרשאה ושמצלמה זמינה.');
      } finally {
        if (!cancelled) setStarting(false);
      }
    };
    start();

    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch { /* ignore */ }
      controlsRef.current = null;
    };
  }, [open, onScan]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileScanError(null);

    try {
      const reader = new BrowserQRCodeReader();
      const url = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(url);
        haptic('medium');
        onScan(result.getText());
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      setFileScanError('לא זיהינו QR בתמונה. ודא שה-QR ברור ומלא בתמונה.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen PaperProps={{ sx: { bgcolor: '#000' } }}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelected} />

      <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.5, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', zIndex: 2,
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

        <Box sx={{ flex: 1, position: 'relative', bgcolor: '#000' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {!error && (
            <Box sx={{
              position: 'absolute', bottom: 32, left: 0, right: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, px: 3,
            }}>
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.8)', textAlign: 'center' }}>
                {starting ? 'פותח את המצלמה...' : 'כוון את ה-QR למרכז המסך'}
              </Typography>
              {fileScanError && (
                <Typography sx={{ fontSize: 12, color: '#FCA5A5', textAlign: 'center', bgcolor: 'rgba(0,0,0,0.6)', px: 1.5, py: 0.75, borderRadius: '10px' }}>
                  {fileScanError}
                </Typography>
              )}
              <Button
                onClick={() => { haptic('light'); fileInputRef.current?.click(); }}
                startIcon={<PhotoLibraryIcon />}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.92)', color: '#0F172A', borderRadius: '999px',
                  px: 2.5, py: 1, fontWeight: 700, fontSize: 13.5, textTransform: 'none',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                  '& .MuiButton-startIcon': { marginInlineEnd: '8px' },
                }}
              >
                בחר תמונה מהגלריה
              </Button>
            </Box>
          )}

          {error && (
            <Box sx={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 2, p: 3, bgcolor: 'rgba(0,0,0,0.85)',
            }}>
              <Typography sx={{ color: 'white', fontSize: 15, textAlign: 'center', maxWidth: 320 }}>
                {error}
              </Typography>
              {fileScanError && (
                <Typography sx={{ fontSize: 12, color: '#FCA5A5', textAlign: 'center', maxWidth: 320 }}>
                  {fileScanError}
                </Typography>
              )}
              <Button
                onClick={() => { haptic('light'); fileInputRef.current?.click(); }}
                startIcon={<PhotoLibraryIcon />}
                variant="contained"
                sx={{ textTransform: 'none', fontWeight: 700, '& .MuiButton-startIcon': { marginInlineEnd: '8px' } }}
              >
                בחר תמונה מהגלריה
              </Button>
              <Button onClick={onClose} sx={{ color: 'white' }}>סגור</Button>
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  );
};
