import { Box, Typography, Button } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { haptic } from '../helpers';
import { useSettings } from '../context/SettingsContext';
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
export const QRScannerConsentOverlay = ({ fileScanError, galleryConsent, onOpenCamera, onPickGallery, mode = 'qr' }: QRScannerConsentOverlayProps) => {
  const { t } = useSettings();
  return (
    <Box sx={consentOverlaySx}>
      <QrCodeScannerIcon sx={{ fontSize: 60, color: '#14B8A6' }} />
      <Typography sx={{ fontSize: 18, fontWeight: 800 }}>
        {mode === 'barcode' ? t('scanBarcodeTitle') : t('scanQrTitle')}
      </Typography>
      <Typography sx={consentDescSx}>
        {mode === 'barcode' ? t('scanBarcodeConsentDesc') : t('scanQrConsentDesc')}
        <br />
        <b>{t('scanNoImagesSaved')}</b> — {t('scanLocalOnlyDesc')}
      </Typography>
      <Button
        fullWidth
        variant="contained"
        onClick={() => { haptic('medium'); onOpenCamera(); }}
        sx={consentPrimaryButtonSx}
      >
        {t('scanOpenCamera')}
      </Button>
      <Button
        fullWidth
        onClick={() => { haptic('light'); onPickGallery(); }}
        startIcon={<PhotoLibraryIcon />}
        sx={consentSecondaryButtonSx}
      >
        {t('scanPickFromGalleryAgain')}
      </Button>
      {fileScanError && (
        <Typography sx={inlineErrorChipSx}>
          {fileScanError}
        </Typography>
      )}
      {galleryConsent && !fileScanError && (
        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
          {t('scanGalleryConsentHint')}
        </Typography>
      )}
    </Box>
  );
};
