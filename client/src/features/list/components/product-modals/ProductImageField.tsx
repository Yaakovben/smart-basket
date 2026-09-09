import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import BrokenImageRoundedIcon from '@mui/icons-material/BrokenImageRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { haptic } from '../../../../global/helpers';
import { cldThumb, cldFull, cldBlur } from '../../../../global/helpers/cloudinaryImage';
import { PAPER_NOTE, addChipSx } from '../../helpers/paperNote';
import { useSettings } from '../../../../global/context/SettingsContext';
import { ImageLightbox, ProgressiveImage } from '../../../../global/components';
import { compressProductImage, buildUploadMaster, uploadToServer, prefetchUploadSignature, isNotConfiguredError, ImageUploadError } from '../../../../global/services/imageUpload';

// ===== שדה תמונת מוצר - משותף ל-Add ול-Edit =====
// עיצוב אחיד לחלוטין עם ProductNoteField: אותו צ'יפ תכלת סגור, אותם
// גוונים (PAPER_NOTE), אותה מסגרת נייר. הערה ותמונה = אותה שפה, אותו צבע.
interface Props {
  value: string;
  onChange: (v: string) => void;
  // נקרא בכל פעם שמתחילה העלאה ברקע (בחירה חדשה או "נסה שוב"), עם ה-promise
  // שלה (הכתובת הסופית או null בכשל/לא-מוגדר) ועם ה-data-URL המקומי שהוצג
  // באותו רגע. למי-שקורה? AddProductModal - כדי לתקן מוצר שכבר נוצר עם ה-
  // data-URL המקומי, אם "הוסף" נלחץ *לפני* שההעלאה הספיקה להסתיים. localValue
  // מגיע מכאן ולא נקרא מה-state של ההורה - ברגע הקריאה ה-onChange(local) עוד
  // לא גרם לרינדור מחדש. ראו useProductForm.ts (pendingImageUploadRef) +
  // useAddProduct.ts.
  onUploadStart?: (promise: Promise<string | null>, localValue: string) => void;
}

// כמה ms להמתין בין ניסיון העלאה ראשון שנכשל לניסיון השני (רשת מתאוששת).
const UPLOAD_RETRY_DELAY_MS = 1200;

export const ProductImageField = memo(({ value, onChange, onUploadStart }: Props) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const ink = isDark ? PAPER_NOTE.inkDark : PAPER_NOTE.inkLight;
  const inputRef = useRef<HTMLInputElement | null>(null);
  // busy = שלב הדחיסה (חוסם, ~שנייה). uploading = העלאה לשרת ברקע
  // (לא חוסם - התמונה כבר מוצגת ושמישה, רק מוחלפת בכתובת מתארחת אם יצליח).
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  // אחוז התקדמות ההעלאה (0-100) מ-xhr.upload.onprogress. null = אין נתון
  // (onprogress עוד לא ירה / לא lengthComputable) -> חיווי ה"מים" נופל
  // לאנימציה הקבועה במקום להישאר תקוע.
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  // tone מבחין בין כשל חוסם (דחיסה נכשלה/גדול מדי - 'error', אדום) לכשל רך
  // (העלאה לענן נכשלה אבל התמונה המקומית עדיין תקינה ושמישה - 'warning',
  // טון ניטרלי). retryable=true כשאפשר "לנסות שוב" (יש קובץ שמור).
  const [error, setError] = useState<{ text: string; tone: 'error' | 'warning'; retryable?: boolean } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  // הבזק "התמונה נשמרה" אחרי שההעלאה לענן הצליחה וה-src הוחלף לכתובת הקבועה.
  const [savedFlash, setSavedFlash] = useState(false);
  // גרירת קובץ מעל השדה (דסקטופ) - מסגרת מקווקוות + רמז.
  const [dragActive, setDragActive] = useState(false);
  // התמונה השמורה (value) נכשלה לטעון - פלייסהולדר "נכשל לטעון" סטטי.
  const [imageFailed, setImageFailed] = useState(false);
  const [seenValue, setSeenValue] = useState(value);
  if (value !== seenValue) {
    setSeenValue(value);
    setImageFailed(false);
  }
  // מזהה בקשה - מתעלמים מתוצאה של דחיסה/העלאה שהמשתמש כבר "עקף"
  // (בחר קובץ אחר, או הסיר את התמונה) לפני שהסתיימה.
  const reqIdRef = useRef(0);
  // הקובץ המקורי של הבחירה הנוכחית - נשמר כדי ש"נסה שוב" יוכל להעלות אותו
  // מחדש בלי לבקש מהמשתמש לבחור שוב.
  const lastFileRef = useRef<File | null>(null);
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // מחמם את חתימת ההעלאה ברגע שהשדה נטען (פתיחת המודל) - כך בחירת הקובץ
  // בפועל לא ממתינה ל-round-trip, במיוחד כשה-API בקור start ב-Render Free.
  useEffect(() => { prefetchUploadSignature(); }, []);
  useEffect(() => () => {
    if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
  }, []);

  const flashSaved = useCallback(() => {
    haptic('light');
    setSavedFlash(true);
    if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
    savedFlashTimer.current = setTimeout(() => setSavedFlash(false), 1500);
  }, []);

  // העלאת רקע של קובץ שכבר נדחס והוצג. מוחזר promise עם הכתובת הסופית /
  // null (כשל / לא-מוגדר). ניסיון שני אוטומטי אחרי השהיה קצרה לפני
  // שמראים "נסה שוב" - הרבה כשלים הם רגעיים (רשת סלולרית).
  const runBackgroundUpload = useCallback((file: File, myId: number): Promise<string | null> => {
    setUploading(true);
    setUploadProgress(null);

    const attempt = async (): Promise<string> => {
      const master = await buildUploadMaster(file);
      if (myId !== reqIdRef.current) throw new Error('superseded');
      return uploadToServer(master, (pct) => {
        if (myId === reqIdRef.current) setUploadProgress(pct);
      });
    };

    return (async (): Promise<string | null> => {
      try {
        let url: string;
        try {
          url = await attempt();
        } catch (firstErr) {
          if (isNotConfiguredError(firstErr) || (firstErr as Error)?.message === 'superseded') throw firstErr;
          await new Promise((r) => setTimeout(r, UPLOAD_RETRY_DELAY_MS));
          if (myId !== reqIdRef.current) return null;
          url = await attempt(); // ניסיון שני - נכשל -> ל-catch החיצוני
        }
        // כל הבייטים עלו - גם אם onprogress לא ירה. מכאן זה עיבוד בצד
        // Cloudinary + preload, לא העלאה -> ה"מים" מתרוקנים.
        if (myId === reqIdRef.current) setUploadProgress(100);
        if (myId === reqIdRef.current) {
          // preload של גרסת ה-thumb לפני שמחליפים את value - אחרת
          // ProgressiveImage מציג לרגע בלור מעל התמונה החדה. timeout של 4ש'
          // כדי שבקשה תקועה לא תשאיר את החיווי דולק לנצח.
          await new Promise<void>((resolve) => {
            const img = new Image();
            let done = false;
            const finish = () => { if (!done) { done = true; resolve(); } };
            img.onload = finish;
            img.onerror = finish;
            img.src = cldThumb(url);
            setTimeout(finish, 4000);
          });
          if (myId === reqIdRef.current) {
            setError(null);
            onChange(url);
            flashSaved();
          }
        }
        return url;
      } catch (err) {
        if ((err as Error)?.message === 'superseded') return null;
        // "לא מוגדר" (503) - נפילה מכוונת ושקטה ל-data-URL, לא באמת כשל.
        if (!isNotConfiguredError(err)) {
          if (import.meta.env.DEV) {
            console.warn('product image server upload failed, keeping local copy', err);
          }
          if (myId === reqIdRef.current) {
            setError({ text: t('photoSyncFailed'), tone: 'warning', retryable: true });
          }
          if (import.meta.env.PROD) {
            import('@sentry/react').then((Sentry) => {
              Sentry.captureException(err, { extra: { context: 'product-image-upload' } });
            }).catch(() => { /* Sentry לא זמין - לא קריטי */ });
          }
        }
        return null;
      } finally {
        if (myId === reqIdRef.current) {
          setUploading(false);
          setUploadProgress(null);
        }
      }
    })();
  }, [onChange, flashSaved, t]);

  // דחיסה מקומית -> הצגה מיידית -> התחלת העלאת רקע. משותף לבחירת קובץ,
  // הדבקה (paste) וגרירה (drop).
  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const myId = ++reqIdRef.current;
    setBusy(true);
    setError(null);

    let local: string;
    try {
      local = await compressProductImage(file);
    } catch (err) {
      if (myId === reqIdRef.current) {
        const code = err instanceof ImageUploadError ? err.code : 'unknown';
        setError({ text: code === 'too-large' ? t('photoTooLarge') : t('photoUploadError'), tone: 'error' });
        haptic('heavy');
        setBusy(false);
      }
      return;
    }
    if (myId !== reqIdRef.current) return;
    lastFileRef.current = file;
    onChange(local);
    haptic('medium');
    setBusy(false);

    onUploadStart?.(runBackgroundUpload(file, myId), local);
  }, [onChange, onUploadStart, runBackgroundUpload, t]);

  const pick = () => {
    if (busy) return;
    haptic('light');
    setError(null);
    inputRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void processFile(file);
  };

  // "נסה שוב" - מעלה מחדש את הקובץ השמור בלי לבקש מהמשתמש לבחור שוב.
  const retryUpload = () => {
    const file = lastFileRef.current;
    if (!file || busy || uploading) return;
    haptic('light');
    setError(null);
    const myId = ++reqIdRef.current;
    onUploadStart?.(runBackgroundUpload(file, myId), value);
  };

  const remove = () => {
    reqIdRef.current++; // מבטל דחיסה/העלאה שרצה
    lastFileRef.current = null;
    setUploading(false);
    setUploadProgress(null);
    setBusy(false);
    setSavedFlash(false);
    haptic('light');
    setError(null);
    onChange('');
  };

  // הדבקת תמונה מהלוח (דסקטופ) - מאזין ברמת ה-window כל עוד השדה מוצג
  // (=המודל פתוח). פועל *רק* כשיש קובץ תמונה בלוח; הדבקת טקסט רגילה לא
  // מושפעת. מוגן מפני busy.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (busy) return;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
      if (file) {
        e.preventDefault();
        void processFile(file);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [busy, processFile]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (busy) return;
    const file = Array.from(e.dataTransfer.files ?? []).find((f) => f.type.startsWith('image/'));
    if (file) void processFile(file);
  };

  return (
    <Box
      sx={{ minWidth: 0, justifySelf: 'stretch', position: 'relative' }}
      onDragOver={(e) => { e.preventDefault(); if (!busy) setDragActive(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragActive(false); }}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {dragActive && (
        <Box aria-hidden="true" sx={{
          position: 'absolute', inset: -6, zIndex: 5,
          borderRadius: '14px',
          border: '2px dashed', borderColor: 'primary.main',
          bgcolor: isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'primary.main', textAlign: 'center', px: 1 }}>
            {t('photoDropHint')}
          </Typography>
        </Box>
      )}

      {value ? (
        // יש תמונה - עמודה: התמונה עצמה צמודה לקצה הימני של תא ה-grid,
        // התווית "תמונה:" מעליה מיושרת לקצה הימני של התמונה עצמה.
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.6 }}>
          <Box sx={{ width: 112, display: 'flex', justifyContent: 'flex-start' }}>
            <Typography sx={{
              fontSize: 10, fontWeight: 800, color: ink,
              letterSpacing: 1, textTransform: 'uppercase',
            }}>
              {t('photo')}:
            </Typography>
          </Box>
          <Box sx={{ position: 'relative', width: 112, flexShrink: 0 }}>
            <Box
              role="button"
              aria-label={imageFailed ? t('photoLoadFailed') : t('viewPhotoAria')}
              onClick={() => { if (imageFailed) return; haptic('light'); setLightbox(true); }}
              sx={{
                position: 'relative',
                width: 112, height: 112,
                borderRadius: '14px', overflow: 'hidden',
                bgcolor: 'action.hover',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                cursor: imageFailed ? 'default' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'transform 0.15s',
                '&:active': imageFailed ? {} : { transform: 'scale(0.97)' },
              }}
            >
              {imageFailed ? (
                // פלייסהולדר "נכשל לטעון" - סטטי לגמרי (בלי אנימציה).
                <Box sx={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.4,
                  color: 'text.disabled',
                }}>
                  <BrokenImageRoundedIcon sx={{ fontSize: 26 }} />
                  <Typography sx={{ fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.15, px: 0.5 }}>
                    {t('photoLoadFailed')}
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* שכבת "טוען" עדינה מתחת לתמונה - shimmer אפרפר ניטרלי
                      (לא תורכיז - תורכיז שמור *רק* לחיווי ההעלאה). */}
                  <Box aria-hidden="true" sx={{
                    position: 'absolute', inset: 0,
                    background: isDark
                      ? 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)'
                      : 'linear-gradient(90deg, rgba(0,0,0,0.03) 25%, rgba(0,0,0,0.07) 50%, rgba(0,0,0,0.03) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'sbImgShimmer 1.4s ease-in-out infinite',
                    '@keyframes sbImgShimmer': {
                      '0%': { backgroundPosition: '200% 0' },
                      '100%': { backgroundPosition: '-200% 0' },
                    },
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  }} />
                  <ProgressiveImage src={cldThumb(value)} blurSrc={cldBlur(value)} alt={t('photo')} onError={() => setImageFailed(true)} />
                </>
              )}
              {/* מסגרת תכלת דקה מעל התמונה */}
              <Box aria-hidden="true" sx={{
                position: 'absolute', inset: 0, borderRadius: '14px',
                border: '1.5px solid',
                borderColor: isDark ? PAPER_NOTE.frameDark : PAPER_NOTE.frameLight,
                pointerEvents: 'none',
              }} />
              {uploading && (
                // חיווי העלאה - "מים" תורכיז שעולים מלמטה למעלה, מסמנים
                // *אך ורק* שההעלאה עדיין רצה וכמה. ברגע ש-100% מהבייטים
                // עלו - המים "מתרוקנים" ונעלמים.
                <Box
                  role="status"
                  aria-label={t('photoProcessing')}
                  sx={{
                    position: 'absolute', left: 0, right: 0, bottom: 0,
                    overflow: 'hidden',
                    bgcolor: 'rgba(20,184,166,0.42)',
                    ...(uploadProgress != null
                      ? {
                          height: uploadProgress >= 100 ? '0%' : `${Math.max(5, uploadProgress)}%`,
                          opacity: uploadProgress >= 100 ? 0 : 1,
                          transition: 'height 0.35s ease-out, opacity 0.3s ease-out',
                        }
                      : {
                          animation: 'sbUploadRise 1.5s ease-in-out infinite',
                          '@keyframes sbUploadRise': {
                            '0%, 100%': { height: '10%' },
                            '50%': { height: '100%' },
                          },
                          '@media (prefers-reduced-motion: reduce)': { animation: 'none', height: '55%' },
                        }),
                    '&::before': {
                      content: '""', position: 'absolute', left: 0, right: 0, top: 0, height: 2,
                      bgcolor: 'rgba(94,234,212,0.95)',
                    },
                  }}
                />
              )}
              {savedFlash && (
                // אישור קצר "נשמר לענן" - עיגול תכלת מלא עם וי, קופץ פנימה
                // ודוהה. תורכיז=מעלה, וי=נשמר לצמיתות.
                <Box aria-hidden="true" sx={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: '50%',
                    bgcolor: '#14B8A6', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 10px rgba(20,184,166,0.5)',
                    animation: 'sbSavedPop 1.5s ease-out forwards',
                    '@keyframes sbSavedPop': {
                      '0%': { transform: 'scale(0.4)', opacity: 0 },
                      '18%': { transform: 'scale(1.08)', opacity: 1 },
                      '32%': { transform: 'scale(1)', opacity: 1 },
                      '72%': { opacity: 1 },
                      '100%': { opacity: 0 },
                    },
                    '@media (prefers-reduced-motion: reduce)': {
                      animation: 'none', opacity: 0.95,
                    },
                  }}>
                    <CheckRoundedIcon sx={{ fontSize: 24 }} />
                  </Box>
                </Box>
              )}
            </Box>
            {/* כפתור הסרה - עיגול אדום בפינה השמאלית-עליונה (הפיזית). */}
            <Box
              role="button"
              aria-label={t('removePhoto')}
              onClick={remove}
              sx={{
                position: 'absolute', top: -8, left: -8,
                width: 24, height: 24, borderRadius: '50%',
                bgcolor: '#DC2626', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                '&:active': { transform: 'scale(0.9)' },
              }}
            >
              <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />
            </Box>
          </Box>
        </Box>
      ) : (
        // אין תמונה - צ'יפ צמוד לאותו קצה (השמאלי ב-RTL) שהתמונה תתפוס.
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <Box
            role="button"
            tabIndex={0}
            aria-label={t('addPhoto')}
            aria-busy={busy}
            onClick={pick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') pick(); }}
            sx={{
              ...addChipSx(isDark),
              position: 'relative', overflow: 'hidden',
              cursor: busy ? 'default' : 'pointer',
              ...(busy ? { '&:hover': {} } : {}),
              // מצב "מעבד" (דחיסה מקומית, ~שנייה) - שטף shimmer עדין.
              ...(busy && {
                '&::after': {
                  content: '""', position: 'absolute', inset: 0,
                  background: isDark
                    ? 'linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.10) 50%, transparent 80%)'
                    : 'linear-gradient(90deg, transparent 20%, rgba(15,118,110,0.12) 50%, transparent 80%)',
                  backgroundSize: '220% 100%',
                  animation: 'sbChipShimmer 1.25s ease-in-out infinite',
                  '@keyframes sbChipShimmer': {
                    '0%': { backgroundPosition: '180% 0' },
                    '100%': { backgroundPosition: '-180% 0' },
                  },
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.5 },
                  pointerEvents: 'none',
                },
              }),
            }}
          >
            <AddPhotoAlternateRoundedIcon sx={{ fontSize: 16, opacity: busy ? 0.65 : 1 }} />
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, fontStyle: 'italic' }}>
              {busy ? t('photoProcessing') : t('addPhoto')}
            </Typography>
          </Box>
        </Box>
      )}

      {error && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap',
          mt: 0.6, px: 0.25,
        }}>
          <Typography sx={{
            fontSize: 11.5,
            color: error.tone === 'warning' ? 'text.secondary' : '#DC2626',
          }}>
            {error.text}
          </Typography>
          {error.retryable && !uploading && lastFileRef.current && (
            <Box
              role="button"
              tabIndex={0}
              onClick={retryUpload}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') retryUpload(); }}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.4,
                px: 0.9, py: 0.3, borderRadius: '999px',
                border: '1.5px solid', borderColor: 'primary.main',
                color: 'primary.main', cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
                WebkitTapHighlightColor: 'transparent',
                transition: 'transform 0.12s, background-color 0.15s',
                '&:active': { transform: 'scale(0.95)' },
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <RefreshRoundedIcon sx={{ fontSize: 13 }} />
              {t('photoRetryUpload')}
            </Box>
          )}
        </Box>
      )}

      {lightbox && value && (
        <ImageLightbox src={cldFull(value)} alt={t('photo')} onClose={() => setLightbox(false)} />
      )}
    </Box>
  );
});
ProductImageField.displayName = 'ProductImageField';
