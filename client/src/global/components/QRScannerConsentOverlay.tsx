import { Box, Typography, Button } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { haptic } from '../helpers';
import {
  consentOverlaySx, consentDescSx, consentPrimaryButtonSx, consentSecondaryButtonSx, inlineErrorChipSx,
} from '../styles/QRScanner.styles';

interface QRScannerConsentOverlayProps {
  fileScanError: string | null;
  galleryConsent: boolean;
  onOpenCamera: () => void;
  onPickGallery: () => void;
  // 'qr' (ברירת מחדל) - הצטרפות לקבוצה. 'barcode' - ברקוד מוצר להוספה מהירה.
  mode?: 'qr' | 'barcode';
}

/**
 * מסך הסכמה ראשוני - לפני שאנחנו פותחים מצלמה או גלריה.
 * השקיפות הזו הכרחית ל-PWA: מסביר למה צריך הרשאה לפני שהדפדפן שואל,
 * נותן למשתמש שליטה. בלעדיו - ייתכן שהמשתמש ידחה אוטומטית "כי לא ברור".
 */
export const QRScannerConsentOverlay = ({ fileScanError, galleryConsent, onOpenCamera, onPickGallery, mode = 'qr' }: QRScannerConsentOverlayProps) => (
  <Box sx={consentOverlaySx}>
    <QrCodeScannerIcon sx={{ fontSize: 60, color: '#14B8A6' }} />
    <Typography sx={{ fontSize: 18, fontWeight: 800 }}>
      {mode === 'barcode' ? 'סריקת ברקוד מוצר' : 'סריקת QR להצטרפות'}
    </Typography>
    <Typography sx={consentDescSx}>
      {mode === 'barcode'
        ? <>לסריקת ברקוד המוצר נשתמש במצלמה של המכשיר שלך, או בתמונה שתבחרו מהגלריה - כדי להוסיף את המוצר במהירות.</>
        : <>לסריקת קוד QR נשתמש במצלמה של המכשיר שלך, או בתמונה שתבחרו מהגלריה.</>
      }
      <br />
      <b>אין שמירה של תמונות או וידאו</b> — הסריקה מתבצעת מקומית במכשיר בלבד.
    </Typography>
    <Button
      fullWidth
      variant="contained"
      onClick={() => { haptic('medium'); onOpenCamera(); }}
      sx={consentPrimaryButtonSx}
    >
      פתח את המצלמה
    </Button>
    <Button
      fullWidth
      onClick={() => { haptic('light'); onPickGallery(); }}
      startIcon={<PhotoLibraryIcon />}
      sx={consentSecondaryButtonSx}
    >
      בחר תמונה מהגלריה במקום
    </Button>
    {fileScanError && (
      <Typography sx={inlineErrorChipSx}>
        {fileScanError}
      </Typography>
    )}
    {galleryConsent && !fileScanError && (
      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
        בחירה מהגלריה — לחץ "בחר תמונה" שוב אם צריך
      </Typography>
    )}
  </Box>
);
