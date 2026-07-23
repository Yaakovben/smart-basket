import { Box, Paper, Skeleton } from '@mui/material';

const SKELETON_INDICES = [1, 2, 3, 4] as const;

export const AdminDashboardLoadingSkeleton = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
    {SKELETON_INDICES.map((i) => (
      <Paper key={i} sx={{ p: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton variant="circular" width={44} height={44} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={22} />
            <Skeleton variant="text" width="40%" height={16} />
          </Box>
        </Box>
      </Paper>
    ))}
  </Box>
);
