import { useEffect, useRef, useState } from 'react';
import { Dialog, Box, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { BrowserQRCodeReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
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
  // הסכמה מקדימה: המצלמה תיפתח רק אחרי שהמשתמש אישר ספציפית פעם ראשונה.
  // אחרי אישור ראשון - שומרים ב-localStorage כדי לא לבקש שוב.
  // שקיפות לפני בקשת ההרשאה של הדפדפן - מסביר מה אנחנו עושים עם הגישה.
  const CONSENT_KEY = 'qr_scanner_consent';
  const [cameraConsent, setCameraConsent] = useState(() => {
    try { return localStorage.getItem(CONSENT_KEY) === 'granted'; } catch { return false; }
  });
  const [galleryConsent, setGalleryConsent] = useState(false);

  // איפוס שגיאות בלבד כשנסגר; ההסכמה לא נמחקת - היוזר אישר פעם, מספיק.
  useEffect(() => {
    if (!open) {
      setGalleryConsent(false);
      setError(null);
      setFileScanError(null);
    }
  }, [open]);

  // שמירת הסכמה ב-localStorage ברגע שהיוזר נתן אותה - לא לשאול שוב
  useEffect(() => {
    if (cameraConsent) {
      try { localStorage.setItem(CONSENT_KEY, 'granted'); } catch { /* storage חסום */ }
    }
  }, [cameraConsent]);

  useEffect(() => {
    if (!open || !cameraConsent) return;
    let cancelled = false;

    const start = async () => {
      setError(null);
      setStarting(true);
      try {
        // צעד 1: בקשת הרשאת מצלמה מפורשת. מציג את ה-prompt של הדפדפן ומחזיר שגיאה ברורה אם נדחה.
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('camera not supported');
        }
        let permissionStream: MediaStream;
        try {
          permissionStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
          // עוצרים את הסטרים הראשוני - ZXing יפתח אחד משלו
          permissionStream.getTracks().forEach(t => t.stop());
        } catch (permErr) {
          const m = permErr instanceof Error ? permErr.message : '';
          if (/Permission|NotAllowed|denied/i.test(m)) throw new Error('Permission denied');
          throw permErr;
        }

        // Hints: TRY_HARDER + פורמט QR בלבד = זיהוי אגרסיבי יותר ולא מבזבז זמן על barcode.
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
        const reader = new BrowserQRCodeReader(hints, { delayBetweenScanAttempts: 150, delayBetweenScanSuccess: 150 });
        const video = videoRef.current;
        if (!video) throw new Error('video element missing');

        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          video,
          (result, _err, c) => {
            if (cancelled) return;
            if (result) {
              haptic('medium');
              c.stop();
              onScan(result.getText());
            }
          },
        );
        try { await video.play(); } catch { /* כבר מנגן */ }
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
  }, [open, cameraConsent, onScan]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileScanError(null);

    try {
      // hints אגרסיביים - זהה לסריקת מצלמה (TRY_HARDER חיוני כדי לזהות QR בצבעים לא-סטנדרטיים)
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      const reader = new BrowserQRCodeReader(hints);
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
          {/* מסך הסכמה ראשוני - לפני שאנחנו פותחים מצלמה או גלריה.
              השקיפות הזו הכרחית ל-PWA: מסביר למה צריך הרשאה לפני שהדפדפן שואל,
              נותן למשתמש שליטה. בלעדיו - ייתכן שהמשתמש ידחה אוטומטית "כי לא ברור". */}
          {!cameraConsent && (
            <Box sx={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 2, px: 3, textAlign: 'center', color: 'white',
              bgcolor: 'rgba(0,0,0,0.92)',
              zIndex: 5,
            }}>
              <QrCodeScannerIcon sx={{ fontSize: 60, color: '#14B8A6' }} />
              <Typography sx={{ fontSize: 18, fontWeight: 800 }}>
                סריקת QR להצטרפות
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', maxWidth: 320, lineHeight: 1.55 }}>
                לסריקת קוד QR נשתמש במצלמה של המכשיר שלך, או בתמונה שתבחרו מהגלריה.
                <br />
                <b>אין שמירה של תמונות או וידאו</b> — הסריקה מתבצעת מקומית במכשיר בלבד.
              </Typography>
              <Button
                fullWidth
                variant="contained"
                onClick={() => { haptic('medium'); setCameraConsent(true); }}
                sx={{
                  maxWidth: 320,
                  py: 1.4,
                  borderRadius: '14px',
                  fontWeight: 800, fontSize: 14.5,
                  textTransform: 'none',
                  bgcolor: '#14B8A6',
                  '&:hover': { bgcolor: '#0D9488' },
                }}
              >
                פתח את המצלמה
              </Button>
              <Button
                fullWidth
                onClick={() => {
                  haptic('light');
                  setGalleryConsent(true);
                  fileInputRef.current?.click();
                }}
                startIcon={<PhotoLibraryIcon />}
                sx={{
                  maxWidth: 320,
                  py: 1.2,
                  borderRadius: '14px',
                  fontWeight: 700, fontSize: 13.5,
                  textTransform: 'none',
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.12)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                  '& .MuiButton-startIcon': { marginInlineEnd: '8px' },
                }}
              >
                בחר תמונה מהגלריה במקום
              </Button>
              {fileScanError && (
                <Typography sx={{
                  fontSize: 12, color: '#FCA5A5', textAlign: 'center',
                  bgcolor: 'rgba(0,0,0,0.6)', px: 1.5, py: 0.75, borderRadius: '10px',
                  mt: 1, maxWidth: 320,
                }}>
                  {fileScanError}
                </Typography>
              )}
              {galleryConsent && !fileScanError && (
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                  בחירה מהגלריה — לחץ "בחר תמונה" שוב אם צריך
                </Typography>
              )}
            </Box>
          )}

          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* מסגרת עזר מרובעת במרכז - עוזרת למשתמש ליישר את ה-QR. ZXing מחפש בכל הפריים
              אבל QR שלא במרכז עם הטיה קלה לרוב לא מזוהה. */}
          {!error && !starting && (
            <Box aria-hidden="true" sx={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <Box sx={{
                width: 240, height: 240, maxWidth: '70vw', maxHeight: '70vw',
                border: '3px solid rgba(255,255,255,0.9)',
                borderRadius: '16px',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                position: 'relative',
              }}>
                {/* פינות מודגשות */}
                {[
                  { top: -3, left: -3, borderRight: 0, borderBottom: 0 },
                  { top: -3, right: -3, borderLeft: 0, borderBottom: 0 },
                  { bottom: -3, left: -3, borderRight: 0, borderTop: 0 },
                  { bottom: -3, right: -3, borderLeft: 0, borderTop: 0 },
                ].map((pos, i) => (
                  <Box key={i} sx={{
                    position: 'absolute', width: 24, height: 24,
                    border: '4px solid #14B8A6', borderRadius: '4px',
                    ...pos,
                  }} />
                ))}
              </Box>
            </Box>
          )}

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
