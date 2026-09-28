import { useState } from 'react';
import { Box, Typography, Button, ButtonBase, InputBase } from '@mui/material';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
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

// המסך לפני סריקה (וגם מתחת לתוצאה, כשיש היסטוריה): הסבר קצר, אישור מיקום
// מראש, הקלדת ברקוד ידנית, וסריקות אחרונות לבדיקה חוזרת בלחיצה.
export const ScanIdleView = ({
  s, isDark, showIntro, hasLocation, locationStatus, onEnableLocation, onSubmitBarcode, recent, onClearRecent,
}: Props) => {
  const [typed, setTyped] = useState('');
  const [invalid, setInvalid] = useState(false);

  const submit = () => {
    const code = typed.replace(/\D/g, '');
    if (!isValidBarcode(code)) { setInvalid(true); haptic('heavy'); return; }
    setInvalid(false);
    setTyped('');
    onSubmitBarcode(code);
  };

  const blocked = locationStatus === 'blocked';

  return (
    <>
      {showIntro && (
        <Box sx={{ ...scanCardSx(isDark), textAlign: 'center', py: 3 } as object}>
          <QrCodeScannerRoundedIcon sx={{ fontSize: 44, color: SCAN_TEAL, mb: 0.75 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 800, mb: 0.5 }}>{s.idleTitle}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>{s.idleBody}</Typography>

          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.75 }}>{s.orType}</Typography>
          <Box
            component="form"
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1, p: 0.5, ps: 1.5, borderRadius: '12px',
              border: '1.5px solid', borderColor: invalid ? 'error.main' : (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.12)'),
            }}
          >
            <InputBase
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
      )}

      {showIntro && (
        hasLocation ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, color: SCAN_TEAL }}>
            <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{s.locationOn}</Typography>
          </Box>
        ) : (
          <Box sx={scanCardSx(isDark)}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: blocked ? 0 : 1.25 }}>
              {blocked ? s.locationBlocked : s.locationPromptIdle}
            </Typography>
            {!blocked && (
              <Button
                variant="outlined" fullWidth startIcon={<MyLocationRoundedIcon />}
                disabled={locationStatus === 'requesting'} onClick={onEnableLocation}
                sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, color: SCAN_TEAL, borderColor: SCAN_TEAL }}
              >
                {s.enableLocation}
              </Button>
            )}
          </Box>
        )
      )}

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
