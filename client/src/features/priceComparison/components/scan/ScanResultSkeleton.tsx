import { Box, Button, Typography, CircularProgress } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { ShimmerBlock } from '../../../../global/components';
import type { PriceScanStrings } from '../../priceScan.strings';
import { SCAN_TEAL } from './scanStyles';

// טעינה בצורת התוצאה עצמה (כדי שהמעבר לא יקפיץ את המסך), עם ביטול זמין תמיד.
// כשזה לוקח יותר מהרגיל (השרת מתעורר, קליטה חלשה בסופר) הביטול נעשה בולט.
export const ScanResultSkeleton = ({ s, slow, onCancel }: { s: PriceScanStrings; slow: boolean; onCancel: () => void }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }} aria-busy="true" aria-live="polite">
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 0.5 }}>
      <CircularProgress size={18} thickness={5} sx={{ color: SCAN_TEAL }} />
      <Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: 'text.secondary' }}>
        {slow ? s.loadingSlow : s.loadingTitle}
      </Typography>
      {!slow && (
        <Button size="small" onClick={onCancel} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary', minWidth: 0 }}>
          {s.cancel}
        </Button>
      )}
    </Box>
    {slow && (
      <Button
        variant="outlined" fullWidth startIcon={<CloseRoundedIcon />} onClick={onCancel}
        sx={{ borderRadius: '14px', py: 1.1, textTransform: 'none', fontWeight: 800, fontSize: 15, color: 'error.main', borderColor: 'error.main', borderWidth: 1.5 }}
      >
        {s.cancel}
      </Button>
    )}
    <ShimmerBlock height={64} radius={18} />
    <ShimmerBlock height={132} radius={18} />
    <ShimmerBlock height={200} radius={18} />
  </Box>
);
