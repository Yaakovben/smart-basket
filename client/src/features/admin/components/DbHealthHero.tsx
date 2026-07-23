import { Box, Typography } from '@mui/material';
import type { DbHealth } from '../../../services/api/admin.api';
import { collectionMeta, type StatusInfo } from '../helpers/dbHealthHelpers';
import { DbHealthCircularGauge } from './DbHealthCircularGauge';

interface DbHealthHeroProps {
  data: DbHealth;
  status: StatusInfo;
  isDark: boolean;
}

// כרטיס Hero עם גאוג' גדול + תקציר סטטוס + הקולקציה שתופסת הכי הרבה מקום
export const DbHealthHero = ({ data, status, isDark }: DbHealthHeroProps) => {
  const StatusIcon = status.icon;
  const topCollection = data.collections.length > 0 ? data.collections[0] : null;

  return (
    <Box sx={{
      p: 3, borderRadius: 3, mb: 2, textAlign: 'center',
      bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
      border: '1px solid', borderColor: 'divider',
    }}>
      <DbHealthCircularGauge percent={data.usedPct} color={status.color} isDark={isDark} />
      <Box sx={{
        mt: 2, p: 1.5, borderRadius: 2,
        bgcolor: status.bg,
        display: 'inline-flex', alignItems: 'center', gap: 1,
      }}>
        <StatusIcon sx={{ color: status.color, fontSize: 22 }} />
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: status.color, lineHeight: 1.2 }}>
            {status.title}
          </Typography>
          <Typography sx={{ fontSize: 11, color: status.color, opacity: 0.85, lineHeight: 1.2 }}>
            {status.subtitle}
          </Typography>
        </Box>
      </Box>
      {topCollection && (
        <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1.5 }}>
          התופס הכי הרבה מקום: <b style={{ color: collectionMeta(topCollection.name).color }}>{collectionMeta(topCollection.name).he}</b>
          {' '}({(((topCollection.storageSize + topCollection.indexSize) / data.totalSize) * 100).toFixed(0)}% מהמאגר)
        </Typography>
      )}
    </Box>
  );
};
