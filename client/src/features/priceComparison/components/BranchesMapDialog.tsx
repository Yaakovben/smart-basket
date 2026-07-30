/**
 * BranchesMapDialog - עוטף את BranchesMapView במסך מלא (לא Modal-גיליון קטן),
 * כדי שהמפה תקבל מספיק מקום אמיתי במקום להידחס. אותו דפוס fullScreen Dialog
 * + dvh (לא vh) כמו ב-QRScanner - vh בדפדפני מובייל גדול מהשטח הנראה בפועל
 * (כולל את השטח מתחת לסרגל הכתובת) וגורם לגלילה מיותרת.
 */

import { Dialog, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import { BranchesMapView } from './BranchesMapView';

interface Props {
  isDark: boolean;
  onClose: () => void;
}

export const BranchesMapDialog = ({ isDark, onClose }: Props) => (
  <Dialog
    open
    onClose={onClose}
    fullScreen
    PaperProps={{ sx: { height: '100dvh', maxHeight: '100dvh', bgcolor: 'background.default' } }}
  >
    <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.5, flexShrink: 0,
        borderBottom: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MapOutlinedIcon sx={{ color: '#0D9488', fontSize: 20 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 16 }}>מפת סניפים</Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="סגור">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, p: 1.25, minHeight: 0 }}>
        <BranchesMapView isDark={isDark} fillHeight />
      </Box>
    </Box>
  </Dialog>
);
