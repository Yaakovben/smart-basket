import { Box, Typography } from '@mui/material';
import type { DbHealth } from '../../../services/api/admin.api';
import { collectionMeta } from '../helpers/dbHealthHelpers';
import { DbHealthStackedBar } from './DbHealthStackedBar';

interface DbHealthCollectionsBreakdownProps {
  data: DbHealth;
  isDark: boolean;
}

// בר ויזואלי שמראה את כל הקולקציות יחד + מקרא צבעים
export const DbHealthCollectionsBreakdown = ({ data, isDark }: DbHealthCollectionsBreakdownProps) => (
  <Box sx={{
    p: 2, borderRadius: 2, mb: 2,
    bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
    border: '1px solid', borderColor: 'divider',
  }}>
    <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.secondary', mb: 1, letterSpacing: 0.3 }}>
      התפלגות קולקציות
    </Typography>
    <DbHealthStackedBar collections={data.collections} totalSize={data.totalSize} />
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
      {data.collections.map(c => {
        const meta = collectionMeta(c.name);
        return (
          <Box key={c.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.4, px: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: meta.color }} />
            <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{meta.he}</Typography>
          </Box>
        );
      })}
    </Box>
  </Box>
);
