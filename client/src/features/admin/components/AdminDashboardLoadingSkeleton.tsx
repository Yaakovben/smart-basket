import { Box, Paper } from '@mui/material';
import { ShimmerBlock } from '../../../global/components';

const SKELETON_INDICES = [1, 2, 3, 4] as const;

// שלד רשימת הלקוחות, באותו מבנה כמו UserRow: אווטאר 44, שם ותגית, "נראה
// לאחרונה", אריח מספר הכניסות, והחץ לפתיחה. אותם ריפוד, רווחים ורדיוס.
export const AdminDashboardLoadingSkeleton = () => (
  <Box aria-busy sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 2 }}>
    {SKELETON_INDICES.map((i) => (
      <Paper key={i} elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <ShimmerBlock circle height={44} />
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <ShimmerBlock width="42%" height={14} radius={7} />
              <ShimmerBlock width={34} height={16} radius={999} />
            </Box>
            <ShimmerBlock width="24%" height={10} radius={5} />
          </Box>
          <ShimmerBlock width={40} height={38} radius={10} />
          <ShimmerBlock circle height={18} />
        </Box>
      </Paper>
    ))}
  </Box>
);
