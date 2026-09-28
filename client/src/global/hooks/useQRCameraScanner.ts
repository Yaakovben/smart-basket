import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from '../helpers';
import { isValidProductBarcode } from './barcodeValidation';

// @zxing/* לא מיובא סטטית בכוונה - זו רק חבילת ה-fallback ל-ZXing (נטענת
// דינמית למטה, רק אם ה-Barcode Detection API הילידי לא נתמך/נכשל). כך מכשירים
// עם תמיכה ילידית (רוב כרום/אנדרואיד) לא מורידים בכלל את ה-chunk הכבד של zxing.

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
  // פנס: האם המצלמה תומכת (בעיקר אנדרואיד), מצב והחלפה. עוזר במעברים חשוכים בסופר
  torchSupported: boolean;
  torchOn: boolean;
  toggleTorch: () => void;
}

// ברקוד מוצר: מפענחים רק את רצועת הכוונת שבאמצע הפריים, מוקטנת, במקום את כל
// ה-1280x720. בפענוח ב-JS (אייפון, שאין בו זיהוי ברקוד מובנה) זה ההבדל בין
// ניסיון בכל כמה עשרות מילישניות לבין שנייה ויותר עד זיהוי.
const CROP_WIDTH_RATIO = 0.86;
const CROP_HEIGHT_RATIO = 0.42;
const DECODE_MAX_WIDTH = 720;
// כל כמה ניסיונות מפענחים גם את כל הפריים, לברקוד שלא ממורכז בכוונת
const FULL_FRAME_EVERY = 4;
const DECODE_INTERVAL_MS = 35;
// בפענוח ב-JS דורשים שתי קריאות זהות ברצף לפני שמקבלים, נגד טעות בספרה
const CONFIRM_WINDOW_MS = 1500;

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
  const trackRef = useRef<MediaStreamTrack | null>(null);
  // הקולבק בהפניה: עמוד שמתרנדר מחדש (למשל בכל עדכון מיקום) לא יפתח את המצלמה מחדש
  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const toggleTorch = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      .then(() => setTorchOn(next))
      .catch(() => setTorchSupported(false));
  }, [torchOn]);

  // איפוס שגיאה/רמז-איכות כשנסגר; ההסכמה לא נמחקת - היוזר אישר פעם, מספיק.
  useEffect(() => {
    if (!open) { setError(null); setSlowScan(false); setTorchOn(false); setTorchSupported(false); }
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

        // מיקוד רציף (ברקוד מקרוב מטושטש בלעדיו) וזיהוי תמיכה בפנס. מה שלא נתמך - מדלגים
        const track = stream.getVideoTracks()[0] ?? null;
        trackRef.current = track;
        if (track) {
          const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { focusMode?: string[]; torch?: boolean };
          if (caps.focusMode?.includes('continuous')) {
            track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => undefined);
          }
          if (caps.torch) setTorchSupported(true);
        }

        // ברקוד מוצר מתקבל רק עם ספרת ביקורת תקינה; QR כמו שהוא
        const acceptable = (value: string) => mode !== 'barcode' || isValidProductBarcode(value);
        const accept = (value: string) => {
          haptic('success');
          stream.getTracks().forEach(t => t.stop());
          onScanRef.current(value);
        };

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
                    const hit = results.find(r => acceptable(r.rawValue));
                    if (hit) {
                      accept(hit.rawValue);
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
          // טעינה דינמית - רק עכשיו, כשבאמת אין ברירה אחרת מלבד ZXing, מורידים
          // את ה-chunk הכבד שלו (ראו הערה למעלה).
          const [{ BrowserQRCodeReader, BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] =
            await Promise.all([import('@zxing/browser'), import('@zxing/library')]);

          // פורמטים סטנדרטיים של ברקוד מוצר (לא QR) - EAN/UPC הם הנפוצים במדפי סופר.
          const PRODUCT_BARCODE_FORMATS = [
            BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
            BarcodeFormat.CODE_128,
          ];

          // הינטים: TRY_HARDER לא מופעל כאן בכוונה - זה סטרימינג חי עם עשרות
          // ניסיונות בשנייה, אז עדיף ניסיון מהיר וזול שרץ שוב מיד על הפריים
          // הבא, על פני ניסיון יסודי-אך-איטי על כל פריים בודד. TRY_HARDER כן
          // חשוב בפענוח תמונה בודדת מהגלריה (handleFileSelected ב-QRScanner.tsx)
          // כי שם אין "פריים הבא" לנסות בו.
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, mode === 'barcode' ? PRODUCT_BARCODE_FORMATS : [BarcodeFormat.QR_CODE]);

          if (mode === 'barcode') {
            // לולאת פענוח משלנו על רצועת הכוונת (ראו CROP_* למעלה)
            const reader = new BrowserMultiFormatReader(hints);
            video.srcObject = stream;
            try { await video.play(); } catch { /* כבר מנגן */ }
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            let timer = 0;
            let attempt = 0;
            let pending: { value: string; at: number } | null = null;
            const tick = () => {
              if (cancelled || !ctx) return;
              const vw = video.videoWidth;
              const vh = video.videoHeight;
              if (vw && vh) {
                attempt++;
                const full = attempt % FULL_FRAME_EVERY === 0;
                const sw = full ? vw : vw * CROP_WIDTH_RATIO;
                const sh = full ? vh : vh * CROP_HEIGHT_RATIO;
                const scale = Math.min(1, DECODE_MAX_WIDTH / sw);
                canvas.width = Math.round(sw * scale);
                canvas.height = Math.round(sh * scale);
                ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
                try {
                  const value = reader.decodeFromCanvas(canvas).getText();
                  if (acceptable(value)) {
                    const now = Date.now();
                    if (pending && pending.value === value && now - pending.at < CONFIRM_WINDOW_MS) {
                      accept(value);
                      return;
                    }
                    pending = { value, at: now };
                  }
                } catch { /* אין ברקוד בפריים הזה - ממשיכים */ }
              }
              timer = window.setTimeout(tick, DECODE_INTERVAL_MS);
            };
            timer = window.setTimeout(tick, 0);
            controlsRef.current = {
              stop: () => {
                window.clearTimeout(timer);
                stream.getTracks().forEach(t => t.stop());
              },
            };
          } else {
            const readerOptions = { delayBetweenScanAttempts: 50, delayBetweenScanSuccess: 150 };
            const reader = new BrowserQRCodeReader(hints, readerOptions);
            const controls = await reader.decodeFromStream(stream, video, (result, _err, c) => {
              if (cancelled) return;
              if (result) {
                haptic('success');
                c.stop();
                onScanRef.current(result.getText());
              }
            });
            if (cancelled) {
              controls.stop();
              return;
            }
            controlsRef.current = controls;
          }
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
      trackRef.current = null;
    };
  }, [open, cameraConsent, mode]);

  return { videoRef, error, starting, slowScan, torchSupported, torchOn, toggleTorch };
};
