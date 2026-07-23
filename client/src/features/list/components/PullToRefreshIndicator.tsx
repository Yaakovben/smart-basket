import { memo } from 'react';
import { Box } from '@mui/material';
import { PULL_THRESHOLD, PULL_MAX } from '../helpers/list-helpers';

// ===== אינדיקטור Pull to Refresh - מופיע מעל התוכן בזמן משיכה =====
interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  pullActive: boolean;
}

export const PullToRefreshIndicator = memo(({ pullDistance, refreshing, pullActive }: PullToRefreshIndicatorProps) => {
  if (!(pullDistance > 0 || refreshing)) return null;

  return (
    <Box sx={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: refreshing ? 50 : Math.min(pullDistance, PULL_MAX),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: 'background.default',
      transition: pullActive ? 'none' : 'height 0.2s ease',
      zIndex: 5,
      pointerEvents: 'none',
    }}>
      <Box sx={{
        fontSize: 22,
        opacity: refreshing ? 1 : Math.min(1, pullDistance / PULL_THRESHOLD),
        transform: refreshing
          ? 'rotate(0deg)'
          : `rotate(${Math.min(180, (pullDistance / PULL_THRESHOLD) * 180)}deg)`,
        transition: refreshing ? 'transform 0.4s linear' : 'none',
        animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
        '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
      }}>
        🔄
      </Box>
    </Box>
  );
});
PullToRefreshIndicator.displayName = 'PullToRefreshIndicator';
