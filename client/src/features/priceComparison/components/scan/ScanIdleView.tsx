import { useState } from 'react';
import { Box, Typography, Button, ButtonBase, InputBase } from '@mui/material';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import KeyboardRoundedIcon from '@mui/icons-material/KeyboardRounded';
import { formatILS, haptic } from '../../../../global/helpers';
import type { LocationStatus } from '../../hooks/useUserLocation';
import type { RecentScan } from '../../hooks/usePriceScan';
import { isValidBarcode } from '../../hooks/usePriceScan';
import type { PriceScanStrings } from '../../priceScan.strings';
import { scanCardSx, scanLabelSx, SCAN_TEAL } from './scanStyles';

interface Props {
  s: PriceScanStrings;
  isDark: boolean;
  showIntro: boolean;
  hasLocation: boolean;
  locationStatus: LocationStatus;
  onEnableLocation: () => void;
  onSubmitBarcode: (code: string) => void;
  recent: RecentScan[];
  onClearRecent: () => void;
}

// המסך לפני סריקה (וגם מתחת לתוצאה, כשיש היסטוריה): הסבר קצר ונקי, אישור
// מיקום רק כשצריך, הקלדת ברקוד בלחיצה, וסריקות אחרונות לבדיקה חוזרת.
export const ScanIdleView = ({
  s, isDark, showIntro, hasLocation, locationStatus, onEnableLocation, onSubmitBarcode, recent, onClearRecent,
}: Props) => {
  const [typed, setTyped] = useState('');
  const [invalid, setInvalid] = useState(false);
  // הקלדה ידנית מקופלת כברירת מחדל: רוב המשתמשים סורקים, והשדה הפתוח העמיס על המסך
  const [manualOpen, setManualOpen] = useState(false);

  const submit = () => {
    const code = typed.replace(/\D/g, '');
    if (!isValidBarcode(code)) { setInvalid(true); haptic('heavy'); return; }
    setInvalid(false);
    setTyped('');
    onSubmitBarcode(code);
  };

  const blocked = locationStatus === 'blocked';
  const softTeal = isDark ? 'rgba(13,148,136,0.18)' : 'rgba(13,148,136,0.09)';

  return (
    <>
      {showIntro && (
        <Box sx={{ textAlign: 'center', pt: 3, pb: 0.5, px: 1 }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: '22px', mx: 'auto', mb: 1.75,
            display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: softTeal,
          }}>
            <QrCodeScannerRoundedIcon sx={{ fontSize: 38, color: SCAN_TEAL }} />
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 800, mb: 0.75 }}>{s.idleTitle}</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.6, maxWidth: 300, mx: 'auto' }}>
            {s.idleBody}
          </Typography>
          {hasLocation && (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 1.75, px: 1.25, py: 0.5,
              borderRadius: '999px', bgcolor: softTeal, color: SCAN_TEAL,
            }}>
              <CheckCircleRoundedIcon sx={{ fontSize: 15 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{s.locationOn}</Typography>
            </Box>
          )}
        </Box>
      )}

      {showIntro && !hasLocation && (
        <Box sx={scanCardSx(isDark)}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: blocked ? 0 : 1.25 }}>
            {blocked ? s.locationBlocked : s.locationPromptIdle}
          </Typography>
          {!blocked && (
            <Button
              variant="outlined" fullWidth onClick={onEnableLocation}
              disabled={locationStatus === 'requesting'}
              sx={{ borderRadius: '12px', gap: 1, textTransform: 'none', fontWeight: 700, color: SCAN_TEAL, borderColor: SCAN_TEAL }}
            >
              <MyLocationRoundedIcon sx={{ fontSize: 18 }} />
              {s.enableLocation}
            </Button>
          )}
        </Box>
      )}

      {showIntro && (manualOpen ? (
        <Box>
          <Box
            component="form"
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1, p: 0.5, ps: 1.5, borderRadius: '14px', bgcolor: 'background.paper',
              border: '1.5px solid', borderColor: invalid ? 'error.main' : (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.12)'),
            }}
          >
            <InputBase
              autoFocus
              value={typed}
              onChange={(e) => { setTyped(e.target.value); if (invalid) setInvalid(false); }}
              placeholder={s.manualPlaceholder}
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 14, dir: 'ltr', 'aria-label': s.manualPlaceholder }}
              sx={{ flex: 1, fontSize: 15, letterSpacing: 1 }}
            />
            <Button type="submit" disabled={!typed} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800, color: SCAN_TEAL, minWidth: 0, px: 1.5 }}>
              {s.manualSubmit}
            </Button>
          </Box>
          {invalid && <Typography sx={{ fontSize: 12, color: 'error.main', mt: 0.5, textAlign: 'start' }}>{s.manualInvalid}</Typography>}
        </Box>
      ) : (
        <Button
          onClick={() => { haptic('light'); setManualOpen(true); }}
          sx={{ alignSelf: 'center', gap: 0.75, textTransform: 'none', fontWeight: 700, fontSize: 13.5, color: 'text.secondary', borderRadius: '10px' }}
        >
          <KeyboardRoundedIcon sx={{ fontSize: 18 }} />
          {s.typeManually}
        </Button>
      ))}

      {recent.length > 0 && (
        <Box sx={scanCardSx(isDark)}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <HistoryRoundedIcon sx={{ fontSize: 16, color: 'text.secondary', me: 0.5 }} />
            <Typography sx={{ ...scanLabelSx, mb: 0, flex: 1 } as object}>{s.recentTitle}</Typography>
            <Button size="small" onClick={() => { haptic('light'); onClearRecent(); }} sx={{ textTransform: 'none', color: 'text.secondary', minWidth: 0 }}>
              {s.clearRecent}
            </Button>
          </Box>
          {recent.map((r) => (
            <ButtonBase
              key={r.barcode}
              onClick={() => { haptic('light'); onSubmitBarcode(r.barcode); }}
              sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1, py: 1, px: 0.5, borderRadius: '10px', textAlign: 'start' }}
            >
              <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', flexShrink: 0 }}>
                {s.from}{formatILS(r.cheapestPrice, 2)}
              </Typography>
            </ButtonBase>
          ))}
        </Box>
      )}
    </>
  );
};
