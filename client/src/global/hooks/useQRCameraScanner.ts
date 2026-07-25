import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import { haptic } from '../helpers';

// פורמטים סטנדרטיים של ברקוד מוצר (לא QR) - EAN/UPC הם הנפוצים במדפי סופר.
const PRODUCT_BARCODE_FORMATS = [
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
];

interface UseQRCameraScannerParams {
  open: boolean;
  cameraConsent: boolean;
  onScan: (value: string) => void;
  // 'qr' (ברירת מחדל) - הצטרפות לקבוצה. 'barcode' - ברקוד מוצר (EAN/UPC).
  mode?: 'qr' | 'barcode';
}

interface UseQRCameraScannerResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  error: string | null;
  starting: boolean;
}

/**
 * מנהל את מחזור החיים של סריקת QR דרך המצלמה: בקשת הרשאה, פתיחת ה-reader
 * ופענוח מתמשך מול הוידאו. מנקה את הסריקה בסגירה/unmount, ומאפס שגיאה בסגירת הדיאלוג.
 */
export const useQRCameraScanner = ({ open, cameraConsent, onScan, mode = 'qr' }: UseQRCameraScannerParams): UseQRCameraScannerResult => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // איפוס שגיאה בלבד כשנסגר; ההסכמה לא נמחקת - היוזר אישר פעם, מספיק.
  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

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

        // Hints: TRY_HARDER + רשימת פורמטים מצומצמת לפי mode = זיהוי אגרסיבי
        // יותר ולא מבזבז זמן על פורמטים לא-רלוונטיים.
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, mode === 'barcode' ? PRODUCT_BARCODE_FORMATS : [BarcodeFormat.QR_CODE]);
        const readerOptions = { delayBetweenScanAttempts: 150, delayBetweenScanSuccess: 150 };
        const reader = mode === 'barcode'
          ? new BrowserMultiFormatReader(hints, readerOptions)
          : new BrowserQRCodeReader(hints, readerOptions);
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
  }, [open, cameraConsent, onScan, mode]);

  return { videoRef, error, starting };
};
