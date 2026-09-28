import { Box } from '@mui/material';
import { ShimmerBlock } from '../../../../global/components';

// שלד בצורת התוצאה עצמה (כרטיס מוצר, כרטיס תשובה, רשימת סניפים), כדי שהמעבר
// לתוצאה לא יקפיץ את המסך.
export const ScanResultSkeleton = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }} aria-busy="true">
    <ShimmerBlock height={64} radius={18} />
    <ShimmerBlock height={132} radius={18} />
    <ShimmerBlock height={200} radius={18} />
  </Box>
);
