import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import { ShimmerBlock } from '../../../global/components';
import { useDbHealth } from '../hooks/useDbHealth';
import { useCloudinaryHealth } from '../hooks/useCloudinaryHealth';
import { statusInfo, tierName } from '../helpers/dbHealthHelpers';
import { DbHealthHeader } from './DbHealthHeader';
import { DbHealthHero } from './DbHealthHero';
import { DbHealthStatsRow } from './DbHealthStatsRow';
import { DbHealthSummaryBreakdown } from './DbHealthSummaryBreakdown';
import { DbHealthCollectionsBreakdown } from './DbHealthCollectionsBreakdown';
import { DbHealthCollectionsList } from './DbHealthCollectionsList';
import { CloudinaryHealthContent } from './CloudinaryHealthContent';

interface Props {
  isDark: boolean;
  onClose: () => void;
}

type HealthTab = 'mongo' | 'cloudinary';

const timeText = (d: Date | null): string | null =>
  d ? d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : null;

export const DbHealthCard = ({ isDark, onClose }: Props) => {
  const [tab, setTab] = useState<HealthTab>('mongo');

  const mongo = useDbHealth();
  const cloud = useCloudinaryHealth();
  const status = mongo.data ? statusInfo(mongo.data.status, isDark) : null;

  const active = tab === 'mongo' ? mongo : cloud;
  const lastUpdatedText = timeText(active.lastFetchAt);

  const metaChip = (text: string) => (
    <Box sx={{
      px: 0.7, py: 0.1, borderRadius: 0.75,
      bgcolor: isDark ? 'rgba(13,148,136,0.18)' : '#CCFBF1',
      border: '1px solid', borderColor: '#0D9488',
    }}>
      <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#0D9488', letterSpacing: 0.3 }}>{text}</Typography>
    </Box>
  );

  const meta = tab === 'mongo'
    ? (mongo.data ? (
        <>
          {metaChip(`Atlas ${tierName(mongo.data.limitMB)}`)}
          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>· {mongo.data.limitMB} MB</Typography>
          {lastUpdatedText && <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>· עודכן {lastUpdatedText}</Typography>}
        </>
      ) : undefined)
    : (cloud.data?.configured ? (
        <>
          {metaChip(cloud.data.plan || 'Cloudinary')}
          {lastUpdatedText && <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>· עודכן {lastUpdatedText}</Typography>}
        </>
      ) : undefined);

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 2000,
      bgcolor: isDark ? '#0F172A' : '#F8FAFC',
      display: 'flex', flexDirection: 'column',
      pt: 'env(safe-area-inset-top)',
    }}>
      <DbHealthHeader
        loading={active.loading}
        onRefresh={active.load}
        onClose={onClose}
        icon={tab === 'mongo'
          ? <StorageIcon sx={{ color: '#0D9488' }} />
          : <CloudQueueIcon sx={{ color: '#0D9488' }} />}
        title={tab === 'mongo' ? 'שימוש במאגר' : 'שימוש ב-Cloudinary'}
        meta={meta}
      />

      {/* טאבים */}
      <Box sx={{ display: 'flex', gap: 0.75, px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
        {([
          { key: 'mongo' as const, label: 'MongoDB' },
          { key: 'cloudinary' as const, label: 'Cloudinary' },
        ]).map(({ key, label }) => (
          <Box
            key={key}
            onClick={() => setTab(key)}
            role="button"
            tabIndex={0}
            sx={{
              flex: 1, textAlign: 'center', py: 0.85, borderRadius: '10px', cursor: 'pointer',
              fontSize: 13, fontWeight: 800,
              bgcolor: tab === key ? '#0D9488' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(13,148,136,0.06)'),
              color: tab === key ? '#fff' : 'text.secondary',
              transition: 'background-color 0.15s',
              '&:active': { transform: 'scale(0.98)' },
            }}
          >
            {label}
          </Box>
        ))}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, pb: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        {tab === 'mongo' && (
          <>
            {mongo.loading && !mongo.data && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, py: 2 }}>
                <ShimmerBlock height={140} radius={16} />
                <ShimmerBlock height={68} radius={12} />
                <ShimmerBlock height={68} radius={12} />
                <ShimmerBlock height={68} radius={12} />
              </Box>
            )}
            {mongo.data && status && (
              <>
                <DbHealthHero data={mongo.data} status={status} isDark={isDark} />
                <DbHealthStatsRow data={mongo.data} isDark={isDark} />
                <DbHealthSummaryBreakdown data={mongo.data} isDark={isDark} />
                <DbHealthCollectionsBreakdown data={mongo.data} isDark={isDark} />
                <DbHealthCollectionsList data={mongo.data} isDark={isDark} />
              </>
            )}
          </>
        )}

        {tab === 'cloudinary' && (
          <>
            {cloud.loading && !cloud.data && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, py: 2 }}>
                <ShimmerBlock height={140} radius={16} />
                <ShimmerBlock height={120} radius={12} />
                <ShimmerBlock height={68} radius={12} />
              </Box>
            )}
            {!cloud.loading || cloud.data ? <CloudinaryHealthContent data={cloud.data} isDark={isDark} /> : null}
          </>
        )}
      </Box>
    </Box>
  );
};
