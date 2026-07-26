import { useEffect, useRef, useState } from 'react';
import { Dialog, Box, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { haptic } from '../helpers';
import { useQRCameraScanner } from '../hooks/useQRCameraScanner';
import { QRScannerConsentOverlay } from './QRScannerConsentOverlay';
import {
  dialogPaperSx, rootBoxSx, headerSx, headerTitleRowSx, videoAreaSx,
  videoStyle, frameOverlaySx, frameBoxSx, FRAME_CORNER_POSITIONS, frameCornerSx,
  scanLineSx, bottomStatusSx, statusTextSx, galleryPillButtonSx,
  errorOverlaySx, errorTextSx, errorSubTextSx, errorGalleryButtonSx,
} from '../styles/QRScanner.styles';

// @zxing/* לא מיובא סטטית בכוונה - נטען דינמית רק כשבאמת נבחרת תמונה
// מהגלריה (למטה ב-handleFileSelected), כדי לא לגרור את החבילה הכבדה הזו
// לתוך ה-chunk של הסורק כשהמצלמה החיה משתמשת ב-Barcode Detection API
// הילידי בלבד (ראו useQRCameraScanner.ts).

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
  // 'qr' (ברירת מחדל) - הצטרפות לקבוצה. 'barcode' - ברקוד מוצר (EAN/UPC) להוספה מהירה.
  mode?: 'qr' | 'barcode';
}

/**
 * סורק QR/ברקוד מובנה באפליקציה. מבוסס על @zxing/browser (קל משמעותית מ-html5-qrcode).
 * מבקש הרשאת מצלמה, ומאפשר גם לבחור תמונה מהגלריה אם הקוד התקבל כקובץ.
 */
export const QRScanner = ({ open, onClose, onScan, mode = 'qr' }: QRScannerProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileScanError, setFileScanError] = useState<string | null>(null);
  // הסכמה מקדימה: המצלמה תיפתח רק אחרי שהמשתמש אישר ספציפית פעם ראשונה.
  // אחרי אישור ראשון - שומרים ב-localStorage כדי לא לבקש שוב.
  // שקיפות לפני בקשת ההרשאה של הדפדפן - מסביר מה אנחנו עושים עם הגישה.
  const CONSENT_KEY = 'qr_scanner_consent';
  const [cameraConsent, setCameraConsent] = useState(() => {
    try { return localStorage.getItem(CONSENT_KEY) === 'granted'; } catch { return false; }
  });
  const [galleryConsent, setGalleryConsent] = useState(false);

  const { videoRef, error, starting, slowScan } = useQRCameraScanner({ open, cameraConsent, onScan, mode });

  // איפוס גלריה/שגיאת קובץ כשנסגר; ההסכמה לא נמחקת - היוזר אישר פעם, מספיק.
  useEffect(() => {
    if (!open) {
      setGalleryConsent(false);
      setFileScanError(null);
    }
  }, [open]);

  // שמירת הסכמה ב-localStorage ברגע שהיוזר נתן אותה - לא לשאול שוב
  useEffect(() => {
    if (cameraConsent) {
      try { localStorage.setItem(CONSENT_KEY, 'granted'); } catch { /* storage חסום */ }
    }
  }, [cameraConsent]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileScanError(null);

    try {
      const [{ BrowserQRCodeReader, BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] =
        await Promise.all([import('@zxing/browser'), import('@zxing/library')]);
      const PRODUCT_BARCODE_FORMATS = [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
      ];
      // TRY_HARDER חיוני כאן (בניגוד לסריקת מצלמה חיה) - זו תמונה בודדת,
      // אין "פריים הבא" לנסות בו, אז שווה לפענח ביסודיות גם אם זה איטי יותר.
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, mode === 'barcode' ? PRODUCT_BARCODE_FORMATS : [BarcodeFormat.QR_CODE]);
      const reader = mode === 'barcode' ? new BrowserMultiFormatReader(hints) : new BrowserQRCodeReader(hints);
      const url = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(url);
        haptic('medium');
        onScan(result.getText());
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      setFileScanError(mode === 'barcode' ? 'לא זיהינו ברקוד בתמונה. ודא שהוא ברור ומלא בתמונה.' : 'לא זיהינו QR בתמונה. ודא שה-QR ברור ומלא בתמונה.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen PaperProps={{ sx: dialogPaperSx }}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelected} />

      <Box sx={rootBoxSx}>
        <Box sx={headerSx}>
          <IconButton onClick={onClose} aria-label="סגור" sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
          <Box sx={headerTitleRowSx}>
            <QrCodeScannerIcon />
            <Typography sx={{ fontWeight: 700 }}>{mode === 'barcode' ? 'סרוק ברקוד' : 'סרוק QR'}</Typography>
          </Box>
          <Box sx={{ width: 40 }} />
        </Box>

        <Box sx={videoAreaSx}>
          {!cameraConsent && (
            <QRScannerConsentOverlay
              fileScanError={fileScanError}
              galleryConsent={galleryConsent}
              onOpenCamera={() => setCameraConsent(true)}
              onPickGallery={() => { setGalleryConsent(true); fileInputRef.current?.click(); }}
              mode={mode}
            />
          )}

          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={videoStyle}
          />

          {/* מסגרת עזר מרובעת במרכז - עוזרת למשתמש ליישר את ה-QR. ZXing מחפש בכל הפריים
              אבל QR שלא במרכז עם הטיה קלה לרוב לא מזוהה. */}
          {!error && !starting && (
            <Box aria-hidden="true" sx={frameOverlaySx}>
              <Box sx={frameBoxSx}>
                {/* פינות מודגשות */}
                {FRAME_CORNER_POSITIONS.map((pos, i) => (
                  <Box key={i} sx={frameCornerSx(pos)} />
                ))}
                {/* קו סריקה נע - מדגיש שהסריקה פעילה בזמן אמת */}
                <Box sx={scanLineSx} />
              </Box>
            </Box>
          )}

          {!error && (
            <Box sx={bottomStatusSx}>
              <Typography sx={statusTextSx}>
                {starting ? 'פותח את המצלמה...' : mode === 'barcode' ? 'כוון את הברקוד למרכז המסך' : 'כוון את ה-QR למרכז המסך'}
              </Typography>
              {/* מוצג רק אחרי כמה שניות בלי זיהוי - כנראה בעיית איכות סריקה
                  (תאורה/מיקוד/מרחק), שונה לגמרי מ"הברקוד לא נמצא במאגר"
                  (זו שגיאה שמגיעה רק אחרי זיהוי מוצלח, מוצגת ב-AddProductModal). */}
              {!starting && slowScan && !fileScanError && (
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'center', bgcolor: 'rgba(0,0,0,0.5)', px: 1.5, py: 0.75, borderRadius: '10px', lineHeight: 1.5 }}>
                  {mode === 'barcode'
                    ? 'לא מצליחים לזהות? ודאו תאורה טובה, קרבו את הברקוד ושהוא ישר ובפוקוס'
                    : 'לא מצליחים לזהות? ודאו תאורה טובה והחזיקו את הקוד ישר ובפוקוס'}
                </Typography>
              )}
              {fileScanError && (
                <Typography sx={{ fontSize: 12, color: '#FCA5A5', textAlign: 'center', bgcolor: 'rgba(0,0,0,0.6)', px: 1.5, py: 0.75, borderRadius: '10px' }}>
                  {fileScanError}
                </Typography>
              )}
              <Button
                onClick={() => { haptic('light'); fileInputRef.current?.click(); }}
                startIcon={<PhotoLibraryIcon />}
                sx={galleryPillButtonSx}
              >
                בחר תמונה מהגלריה
              </Button>
            </Box>
          )}

          {error && (
            <Box sx={errorOverlaySx}>
              <Typography sx={errorTextSx}>
                {error}
              </Typography>
              {fileScanError && (
                <Typography sx={errorSubTextSx}>
                  {fileScanError}
                </Typography>
              )}
              <Button
                onClick={() => { haptic('light'); fileInputRef.current?.click(); }}
                startIcon={<PhotoLibraryIcon />}
                variant="contained"
                sx={errorGalleryButtonSx}
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
