import { useState } from 'react';
import { Box, Typography, Button, ButtonBase, InputBase } from '@mui/material';
import { alpha } from '@mui/material/styles';
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
import { scanCardSx, SCAN_TEAL } from './scanStyles';

interface Props {
  s: PriceScanStrings;
  isDark: boolean;
  showIntro: boolean;
  hasLocation: boolean;
  locationStatus: LocationStatus;
  onEnableLocation: () => void;
  onScan: () => void;
  onSubmitBarcode: (code: string) => void;
  recent: RecentScan[];
  onClearRecent: () => void;
}

// המסך לפני סריקה, וגם אחרי שסוגרים את המצלמה: כרטיס אחד ברור עם כפתור סריקה
// גדול בתוכו, הקלדת ברקוד בלחיצה, וסריקות אחרונות לבדיקה חוזרת.
// מתחת לתוצאה מוצגות רק הסריקות האחרונות.
export const ScanIdleView = ({
  s, isDark, showIntro, hasLocation, locationStatus, onEnableLocation, onScan, onSubmitBarcode, recent, onClearRecent,
}: Props) => {
  const [typed, setTyped] = useState('');
  const [invalid, setInvalid] = useState(false);
  // הקלדה ידנית מקופלת כברירת מחדל: רוב המשתמשים סורקים
  const [manualOpen, setManualOpen] = useState(false);

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
        <Box sx={{
          position: 'relative', overflow: 'hidden', borderRadius: '24px', p: 2.5, pt: 3, color: '#fff', textAlign: 'center',
          background: isDark ? 'linear-gradient(160deg, #0F766E 0%, #115E59 100%)' : 'linear-gradient(160deg, #14B8A6 0%, #0D9488 100%)',
          boxShadow: isDark ? 'none' : '0 14px 30px rgba(13,148,136,0.28)',
        }}>
          <Box aria-hidden sx={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)', top: -80, insetInlineEnd: -60 }} />
          <Box aria-hidden sx={{ position: 'absolute', width: 110, height: 110, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)', bottom: -40, insetInlineStart: -30 }} />
          <Box sx={{ position: 'relative' }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '20px', mx: 'auto', mb: 1.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.18)',
            }}>
              <QrCodeScannerRoundedIcon sx={{ fontSize: 34 }} />
            </Box>
            <Typography sx={{ fontSize: 20, fontWeight: 900, mb: 0.5 }}>{s.idleTitle}</Typography>
            <Typography sx={{ fontSize: 14, opacity: 0.92, lineHeight: 1.6, maxWidth: 290, mx: 'auto' }}>{s.idleBody}</Typography>
            {hasLocation && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 1.5, px: 1.25, py: 0.45, borderRadius: '999px', bgcolor: 'rgba(255,255,255,0.18)' }}>
                <CheckCircleRoundedIcon sx={{ fontSize: 15 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{s.locationOn}</Typography>
              </Box>
            )}
            <Button
              fullWidth onClick={() => { haptic('medium'); onScan(); }}
              sx={{
                mt: 2.25, py: 1.35, gap: 1.25, borderRadius: '14px', textTransform: 'none', fontWeight: 900, fontSize: 16,
                bgcolor: '#fff', color: SCAN_TEAL, boxShadow: '0 6px 16px rgba(0,0,0,0.12)', '&:hover': { bgcolor: '#F0FDFA' },
              }}
            >
              {/* רווח קבוע בין האייקון לטקסט (startIcon נצמד לטקסט בעברית) */}
              <QrCodeScannerRoundedIcon sx={{ fontSize: 22 }} />
              {s.scan}
            </Button>
            {!manualOpen && (
              <Button
                onClick={() => { haptic('light'); setManualOpen(true); }}
                sx={{ mt: 1, gap: 0.75, textTransform: 'none', fontWeight: 700, fontSize: 13.5, color: 'rgba(255,255,255,0.92)', borderRadius: '10px' }}
              >
                <KeyboardRoundedIcon sx={{ fontSize: 18 }} />
                {s.typeManually}
              </Button>
            )}
          </Box>
        </Box>
      )}

      {showIntro && manualOpen && (
        <Box>
          <Box
            component="form"
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1, p: 0.5, paddingInlineStart: 1.5, borderRadius: '14px', bgcolor: 'background.paper',
              border: '1.5px solid', borderColor: invalid ? 'error.main' : alpha(SCAN_TEAL, 0.45),
            }}
          >
            <KeyboardRoundedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
            <InputBase
              autoFocus
              value={typed}
              onChange={(e) => { setTyped(e.target.value); if (invalid) setInvalid(false); }}
              placeholder={s.manualPlaceholder}
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 14, dir: 'ltr', 'aria-label': s.manualPlaceholder }}
              sx={{ flex: 1, fontSize: 16, letterSpacing: 1 }}
            />
            <Button type="submit" variant="contained" disabled={!typed} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800, minWidth: 0, px: 2, boxShadow: 'none' }}>
              {s.manualSubmit}
            </Button>
          </Box>
          {invalid && <Typography sx={{ fontSize: 12, color: 'error.main', mt: 0.5, textAlign: 'start' }}>{s.manualInvalid}</Typography>}
        </Box>
      )}

      {showIntro && !hasLocation && (
        <Box sx={{ ...scanCardSx(isDark), display: 'flex', gap: 1.25, alignItems: 'flex-start' } as object}>
          <Box sx={{ width: 36, height: 36, borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(SCAN_TEAL, 0.12), color: SCAN_TEAL }}>
            <MyLocationRoundedIcon sx={{ fontSize: 19 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.55 }}>
              {blocked ? s.locationBlocked : s.locationPromptIdle}
            </Typography>
            {!blocked && (
              <Button
                onClick={onEnableLocation} disabled={locationStatus === 'requesting'}
                sx={{ mt: 0.5, px: 0, textTransform: 'none', fontWeight: 800, color: SCAN_TEAL, minWidth: 0 }}
              >
                {s.enableLocation}
              </Button>
            )}
          </Box>
        </Box>
      )}

      {recent.length > 0 && (
        <Box sx={scanCardSx(isDark)}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box sx={{ width: 30, height: 30, borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(SCAN_TEAL, 0.12), color: SCAN_TEAL }}>
              <HistoryRoundedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Typography sx={{ fontSize: 15, fontWeight: 900, flex: 1 }}>{s.recentTitle}</Typography>
            <Button size="small" onClick={() => { haptic('light'); onClearRecent(); }} sx={{ textTransform: 'none', color: 'text.secondary', minWidth: 0 }}>
              {s.clearRecent}
            </Button>
          </Box>
          {recent.map((r, i) => (
            <ButtonBase
              key={r.barcode}
              onClick={() => { haptic('light'); onSubmitBarcode(r.barcode); }}
              sx={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 1, py: 1.1, px: 0.5, textAlign: 'start',
                borderTop: i === 0 ? 'none' : '1px solid', borderColor: 'divider',
              }}
            >
              <Typography sx={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </Typography>
              <Typography sx={{
                fontSize: 12.5, fontWeight: 800, flexShrink: 0, px: 1, py: 0.3, borderRadius: '8px',
                color: SCAN_TEAL, bgcolor: alpha(SCAN_TEAL, 0.1),
              }}>
                {s.from}{formatILS(r.cheapestPrice, 2)}
              </Typography>
            </ButtonBase>
          ))}
        </Box>
      )}
    </>
  );
};
