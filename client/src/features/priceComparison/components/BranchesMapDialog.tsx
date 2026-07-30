/**
 * BranchesMapDialog - עוטף את BranchesMapView במסך מלא (לא Modal-גיליון קטן),
 * כדי שהמפה תקבל מספיק מקום אמיתי במקום להידחס. אותו דפוס fullScreen Dialog
 * + dvh (לא vh) כמו ב-QRScanner - vh בדפדפני מובייל גדול מהשטח הנראה בפועל
 * (כולל את השטח מתחת לסרגל הכתובת) וגורם לגלילה מיותרת.
 */

/**
 * כפתור סגירה: חץ שמאלה (ArrowForwardIcon בממשק RTL) - עקבי עם ListHeader
 * ושאר מסכי האפליקציה. כותרת ה-header צבועה ב-background.paper (לא default)
 * כדי לשמור על מראה "כרטיס" נפרד מרקע המפה.
 */

import { Dialog, Box, Typography, IconButton, Slide } from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import { forwardRef } from 'react';
import { BranchesMapView } from './BranchesMapView';

// אנימציית כניסה מלמטה - עקבית עם bottom-sheet ועם ה-NavigationPicker
const SlideUp = forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface Props {
  isDark: boolean;
  onClose: () => void;
}

export const BranchesMapDialog = ({ isDark, onClose }: Props) => (
  <Dialog
    open
    onClose={onClose}
    fullScreen
    TransitionComponent={SlideUp}
    PaperProps={{ sx: { height: '100dvh', maxHeight: '100dvh', bgcolor: 'background.default' } }}
  >
    <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* כותרת - background.paper כמו ב-AppBar, לא background.default של המפה */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        px: 1, py: 1, flexShrink: 0,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.07)',
      }}>
        {/* חץ חזרה - insetInlineStart לתמיכה ב-RTL */}
        <IconButton
          onClick={onClose}
          aria-label="חזור"
          sx={{ color: 'text.primary' }}
        >
          <ArrowForwardIcon sx={{ fontSize: 22 }} />
        </IconButton>

        <MapOutlinedIcon sx={{ color: '#0D9488', fontSize: 20 }} />
        <Typography sx={{ fontWeight: 800, fontSize: 16, flex: 1 }}>מפת סניפים</Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <BranchesMapView isDark={isDark} fillHeight />
      </Box>
    </Box>
  </Dialog>
);
