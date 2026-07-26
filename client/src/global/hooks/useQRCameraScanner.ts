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

// אותם פורמטים בשמות המחרוזת של ה-Barcode Detection API הילידי - רץ בקוד
// native של המערכת/דפדפן, מהיר משמעותית מפענוח ב-JS (ZXing). כרגע נתמך בעיקר
// בכרום/אנדרואיד; דפדפנים בלי תמיכה (בעיקר Safari/iOS) יפלו אוטומטית ל-ZXing.
const NATIVE_FORMATS: Record<'qr' | 'barcode', string[]> = {
  qr: ['qr_code'],
  barcode: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
};

interface NativeBarcodeDetector {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
}
interface NativeBarcodeDetectorCtor {
  new (options: { formats: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

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
  // true אם המצלמה פועלת כבר כמה שניות בלי לזהות שום קוד - כנראה בעיית
  // איכות סריקה (תאורה/מיקוד/זווית), לא "הקוד לא קיים במאגר" (זה מגיע
  // רק אחרי פענוח מוצלח, ב-onScan של הקורא - שתי תקלות שונות לגמרי).
  slowScan: boolean;
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
  const [slowScan, setSlowScan] = useState(false);

  // איפוס שגיאה/רמז-איכות כשנסגר; ההסכמה לא נמחקת - היוזר אישר פעם, מספיק.
  useEffect(() => {
    if (!open) { setError(null); setSlowScan(false); }
  }, [open]);

  useEffect(() => {
    if (!open || !cameraConsent) return;
    let cancelled = false;
    let slowScanTimer: ReturnType<typeof setTimeout> | null = null;

    const start = async () => {
      setError(null);
      setSlowScan(false);
      setStarting(true);
      try {
        // צעד 1: בקשת הרשאת מצלמה מפורשת. מציג את ה-prompt של הדפדפן ומחזיר שגיאה ברורה אם נדחה.
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('camera not supported');
        }
        // רזולוציה נמוכה במכוון (HD ולא 4K/1080p+ שהמצלמה עלולה לבחור כברירת
        // מחדל) - לברקוד/QR זה יותר מספיק, וכל ניסיון פענוח על פריים קטן
        // יותר מהיר משמעותית. זה ה-boost המשמעותי ביותר למהירות הסריקה.
        const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 }, height: { ideal: 720 },
        };
        // שומרים את ה-stream ומעבירים אותו הלאה (ל-detector הילידי או ל-ZXing)
        // במקום לעצור אותו ולבקש שוב - כך המצלמה נפתחת פעם אחת בלבד, לא פעמיים.
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: VIDEO_CONSTRAINTS,
            audio: false,
          });
        } catch (permErr) {
          const m = permErr instanceof Error ? permErr.message : '';
          if (/Permission|NotAllowed|denied/i.test(m)) throw new Error('Permission denied');
          throw permErr;
        }
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) throw new Error('video element missing');

        // צעד 2: ניסיון עם ה-Barcode Detection API הילידי - הרבה יותר מהיר
        // מ-ZXing כי הוא רץ native ולא סורק פיקסלים ב-JS. אם לא נתמך (Safari/iOS
        // כרגע) או נכשל - נופלים חזרה ל-ZXing למטה על אותו stream בדיוק, בלי
        // לבקש הרשאת מצלמה בשנית.
        const NativeDetectorCtor = (window as unknown as { BarcodeDetector?: NativeBarcodeDetectorCtor }).BarcodeDetector;
        let usedNative = false;
        if (NativeDetectorCtor) {
          try {
            let formats = NATIVE_FORMATS[mode];
            if (NativeDetectorCtor.getSupportedFormats) {
              const supported = await NativeDetectorCtor.getSupportedFormats();
              formats = formats.filter(f => supported.includes(f));
            }
            if (formats.length) {
              const detector = new NativeDetectorCtor({ formats });
              video.srcObject = stream;
              try { await video.play(); } catch { /* כבר מנגן */ }

              let rafId = 0;
              const loop = () => {
                if (cancelled) return;
                detector.detect(video)
                  .then(results => {
                    if (cancelled) return;
                    if (results.length) {
                      haptic('medium');
                      stream.getTracks().forEach(t => t.stop());
                      onScan(results[0].rawValue);
                    } else {
                      rafId = requestAnimationFrame(loop);
                    }
                  })
                  .catch(() => {
                    // הפריים עדיין לא מוכן, או שגיאת פענוח חד-פעמית - ממשיכים לנסות
                    if (!cancelled) rafId = requestAnimationFrame(loop);
                  });
              };
              rafId = requestAnimationFrame(loop);
              controlsRef.current = {
                stop: () => {
                  cancelAnimationFrame(rafId);
                  stream.getTracks().forEach(t => t.stop());
                },
              };
              usedNative = true;
            }
          } catch {
            // בעיה באתחול הזיהוי הילידי - נופלים ל-ZXing למטה על אותו stream
          }
        }

        if (!usedNative) {
          // הינטים: TRY_HARDER לא מופעל כאן בכוונה - זה סטרימינג חי עם עשרות
          // ניסיונות בשנייה, אז עדיף ניסיון מהיר וזול שרץ שוב מיד על הפריים
          // הבא, על פני ניסיון יסודי-אך-איטי על כל פריים בודד. TRY_HARDER כן
          // חשוב בפענוח תמונה בודדת מהגלריה (handleFileSelected ב-QRScanner.tsx)
          // כי שם אין "פריים הבא" לנסות בו.
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, mode === 'barcode' ? PRODUCT_BARCODE_FORMATS : [BarcodeFormat.QR_CODE]);
          const readerOptions = { delayBetweenScanAttempts: 50, delayBetweenScanSuccess: 150 };
          const reader = mode === 'barcode'
            ? new BrowserMultiFormatReader(hints, readerOptions)
            : new BrowserQRCodeReader(hints, readerOptions);

          const controls = await reader.decodeFromStream(stream, video, (result, _err, c) => {
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
        }

        // המצלמה פועלת ומנסה לפענח - אם 7 שניות עוברות בלי שום זיהוי,
        // כנראה שהבעיה היא איכות הסריקה (תאורה/מיקוד/זווית) ולא שהקוד
        // "לא קיים" (זה מגיע רק אחרי פענוח מוצלח, בקריאה ל-onScan למעלה).
        slowScanTimer = setTimeout(() => { if (!cancelled) setSlowScan(true); }, 7000);
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
      if (slowScanTimer) clearTimeout(slowScanTimer);
      try { controlsRef.current?.stop(); } catch { /* ignore */ }
      controlsRef.current = null;
    };
  }, [open, cameraConsent, onScan, mode]);

  return { videoRef, error, starting, slowScan };
};
