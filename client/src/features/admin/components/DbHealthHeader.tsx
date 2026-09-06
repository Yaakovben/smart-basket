import { Box, Typography, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import type { ReactNode } from 'react';

interface DbHealthHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onClose: () => void;
  icon: ReactNode;
  title: string;
  meta?: ReactNode; // שורת מטא קטנה מתחת לכותרת (badge/עודכן/מגבלה) - תלוית טאב
}

// כותרת כרטיס בריאות השירותים - גנרית (משמשת גם ל-MongoDB וגם ל-Cloudinary).
export const DbHealthHeader = ({ loading, onRefresh, onClose, icon, title, meta }: DbHealthHeaderProps) => (
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
      <IconButton onClick={onRefresh} disabled={loading} aria-label="רענון">
        <RefreshIcon />
      </IconButton>
      <IconButton onClick={onClose} aria-label="סגירה">
        <CloseIcon />
      </IconButton>
    </Box>
  </Box>
);
