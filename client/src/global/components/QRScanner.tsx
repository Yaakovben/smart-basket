import { useEffect, useRef, useState } from 'react';
import { Dialog, Box, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { Html5Qrcode } from 'html5-qrcode';
import { haptic } from '../helpers';

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}

/**
 * סורק QR מובנה באפליקציה. מבקש הרשאת מצלמה, ובנוסף מאפשר לבחור תמונה
 * מהגלריה - שימושי כשה-QR שלך שמור כתמונה או שקיבלת אותו ב-WhatsApp.
 */
export const QRScanner = ({ open, onClose, onScan }: QRScannerProps) => {
  const containerId = 'qr-scanner-container';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [fileScanError, setFileScanError] = useState<string | null>(null);
  // מצב הרשאה: idle (עוד לא ניסינו), requesting (dialog פתוח), granted, denied
  const [permState, setPermState] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

  // בקשת הרשאת מצלמה מפורשת - עובדת יותר אמין ממה שhtml5-qrcode עושה לבד,
  // ומציגה את ה-dialog של ההרשאה מיד ללא תלות בטיימינג של ה-start().
  const requestCameraPermission = async (): Promise<MediaStream | null> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('הדפדפן לא תומך בגישה למצלמה. נסה לבחור תמונה מהגלריה.');
      setPermState('denied');
      return null;
    }
    setPermState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      setPermState('granted');
      return stream;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('הגישה למצלמה נדחתה. אפשר הרשאה בהגדרות הדפדפן, או בחר תמונה מהגלריה.');
        setPermState('denied');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setError('לא נמצאה מצלמה זמינה במכשיר. אפשר לבחור תמונה מהגלריה.');
        setPermState('denied');
      } else {
        setError('לא ניתן לפתוח את המצלמה. אפשר לבחור תמונה מהגלריה.');
        setPermState('denied');
      }
      return null;
    }
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const start = async () => {
      setError(null);
      setFileScanError(null);
      setStarting(true);

      // שלב 1: בקשת הרשאה מפורשת - מוודא שה-dialog יוצג
      const stream = await requestCameraPermission();
      if (cancelled) {
        stream?.getTracks().forEach(t => t.stop());
        return;
      }
      if (!stream) {
        setStarting(false);
        return;
      }
      // עוצרים את ה-stream מיד - ה-Html5Qrcode יפתח משלו. אנחנו רק רצינו
      // להפעיל את ה-permission prompt כדי שלא יהיה לנו race-condition.
      stream.getTracks().forEach(t => t.stop());

      // שלב 2: הפעלת הסורק עצמו
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
            instance.stop().catch(() => {});
          },
          () => { /* decode failure - רגיל בין פריימים */ },
        );
      } catch {
        if (cancelled) return;
        setError('לא ניתן להפעיל את הסורק. אפשר לבחור תמונה מהגלריה.');
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

  // סריקת QR מתוך תמונה שהמשתמש בחר מהגלריה.
  // Html5Qrcode.scanFile עובד גם כשהמצלמה פעילה - נעצור אותה קודם.
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // מאפסים את ה-input כדי שבחירה נוספת של אותו קובץ תעבוד
    e.target.value = '';
    if (!file) return;
    setFileScanError(null);

    try {
      // עוצרים את המצלמה הפעילה (אם יש) - אחרת scanFile ייכשל
      const existing = scannerRef.current;
      if (existing) {
        try { await existing.stop(); } catch { /* ignore */ }
      }
      // יוצרים instance חדש לסריקת קובץ
      const instance = new Html5Qrcode(containerId);
      const decoded = await instance.scanFile(file, false);
      try { await instance.clear(); } catch { /* ignore */ }
      haptic('medium');
      onScan(decoded);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      setFileScanError(
        /No MultiFormat Readers|not found|NotFoundException/i.test(msg)
          ? 'לא זיהינו QR בתמונה. ודא שה-QR ברור ומלא בתמונה.'
          : 'שגיאה בסריקת התמונה. נסה תמונה אחרת.'
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { bgcolor: '#000' } }}
    >
      {/* input נסתר לבחירת תמונה מהגלריה */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

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

          {/* הוראות + כפתור גלריה - צפים מעל תצוגת המצלמה */}
          {!error && (
            <Box sx={{
              position: 'absolute', bottom: 32, left: 0, right: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
              px: 3,
            }}>
              <Typography sx={{
                fontSize: 15, fontWeight: 600, color: 'white',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                textAlign: 'center',
              }}>
                {permState === 'requesting' ? 'מבקש הרשאת מצלמה...'
                  : starting ? 'פותח את המצלמה...'
                  : 'כוון את ה-QR למרכז המסך'}
              </Typography>
              {fileScanError && (
                <Typography sx={{
                  fontSize: 12, color: '#FCA5A5', textAlign: 'center',
                  bgcolor: 'rgba(0,0,0,0.6)', px: 1.5, py: 0.75, borderRadius: '10px',
                }}>
                  {fileScanError}
                </Typography>
              )}
              {/* כפתור גלריה - עיצוב ברור אך לא תוקפני */}
              <Button
                onClick={() => { haptic('light'); fileInputRef.current?.click(); }}
                startIcon={<PhotoLibraryIcon />}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.92)',
                  color: '#0F172A',
                  borderRadius: '999px',
                  px: 2.5, py: 1,
                  fontWeight: 700,
                  fontSize: 13.5,
                  textTransform: 'none',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                  '& .MuiButton-startIcon': { marginInlineEnd: '8px' },
                }}
              >
                בחר תמונה מהגלריה
              </Button>
            </Box>
          )}

          {/* שגיאה כללית - מצלמה לא זמינה. עדיין מאפשרים בחירת תמונה */}
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
              {fileScanError && (
                <Typography sx={{ color: '#FCA5A5', fontSize: 12, textAlign: 'center', maxWidth: 320 }}>
                  {fileScanError}
                </Typography>
              )}
              <Button
                onClick={() => { haptic('light'); fileInputRef.current?.click(); }}
                startIcon={<PhotoLibraryIcon />}
                variant="contained"
                sx={{
                  bgcolor: 'white', color: '#0F172A',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                  borderRadius: '999px', px: 3, py: 1,
                  fontWeight: 700, textTransform: 'none',
                }}
              >
                בחר תמונה מהגלריה
              </Button>
              <Button onClick={onClose} sx={{ color: 'white', textTransform: 'none' }}>סגור</Button>
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  );
};
