import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { ReactNode } from 'react';

interface DbHealthHeaderProps {
  onClose: () => void;
  icon: ReactNode;
  title: string;
  meta?: ReactNode; // שורת מטא קטנה מתחת לכותרת (badge/עודכן/מגבלה) - תלוית טאב
}

// כותרת כרטיס בריאות השירותים - גנרית (משמשת גם ל-MongoDB וגם ל-Cloudinary).
// אין כפתור רענון ידני - הרענון נעשה בגרירה (pull-to-refresh), ראו DbHealthCard.
export const DbHealthHeader = ({ onClose, icon, title, meta }: DbHealthHeaderProps) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider',
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
      {icon}
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{title}</Typography>
        {meta && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.25, flexWrap: 'wrap' }}>
            {meta}
          </Box>
        )}
      </Box>
    </Box>
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <IconButton onClick={onClose} aria-label="סגירה">
        <CloseIcon />
      </IconButton>
    </Box>
  </Box>
);
