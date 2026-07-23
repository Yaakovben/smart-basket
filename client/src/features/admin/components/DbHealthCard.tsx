import { Box } from '@mui/material';
import { ShimmerBlock } from '../../../global/components';
import { useDbHealth } from '../hooks/useDbHealth';
import { statusInfo } from '../helpers/dbHealthHelpers';
import { DbHealthHeader } from './DbHealthHeader';
import { DbHealthHero } from './DbHealthHero';
import { DbHealthStatsRow } from './DbHealthStatsRow';
import { DbHealthSummaryBreakdown } from './DbHealthSummaryBreakdown';
import { DbHealthCollectionsBreakdown } from './DbHealthCollectionsBreakdown';
import { DbHealthCollectionsList } from './DbHealthCollectionsList';

interface Props {
  isDark: boolean;
  onClose: () => void;
}

export const DbHealthCard = ({ isDark, onClose }: Props) => {
  const { data, loading, lastFetchAt, load } = useDbHealth();
  const status = data ? statusInfo(data.status, isDark) : null;
  const lastUpdatedText = lastFetchAt
    ? lastFetchAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 2000,
      bgcolor: isDark ? '#0F172A' : '#F8FAFC',
      display: 'flex', flexDirection: 'column',
      pt: 'env(safe-area-inset-top)',
    }}>
      <DbHealthHeader
        data={data}
        loading={loading}
        isDark={isDark}
        lastUpdatedText={lastUpdatedText}
        onRefresh={load}
        onClose={onClose}
      />

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, pb: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        {loading && !data && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, py: 2 }}>
            <ShimmerBlock height={140} radius={16} />
            <ShimmerBlock height={68} radius={12} />
            <ShimmerBlock height={68} radius={12} />
            <ShimmerBlock height={68} radius={12} />
          </Box>
        )}

        {data && status && (
          <>
            <DbHealthHero data={data} status={status} isDark={isDark} />
            <DbHealthStatsRow data={data} isDark={isDark} />
            <DbHealthSummaryBreakdown data={data} isDark={isDark} />
            <DbHealthCollectionsBreakdown data={data} isDark={isDark} />
            <DbHealthCollectionsList data={data} isDark={isDark} />
          </>
        )}
      </Box>
    </Box>
  );
};
