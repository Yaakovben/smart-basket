import { Box } from '@mui/material';
import { ShimmerBlock } from '../../../global/components';

// שלד באותה פריסה בדיוק של העמוד (הירו + כרטיס שימוש + בחירת תקופה + כפתור),
// כדי שהמעבר לתוכן האמיתי לא יזיז שום דבר על המסך.
export const SubscriptionSkeleton = () => (
  <Box aria-busy="true" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    <ShimmerBlock height={148} radius={22} />
    <ShimmerBlock height={128} radius={18} />
    <ShimmerBlock height={170} radius={18} />
    <ShimmerBlock height={54} radius={14} />
  </Box>
);
