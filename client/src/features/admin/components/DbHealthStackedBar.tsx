import { Box } from '@mui/material';
import type { DbHealthCollection } from '../../../services/api/admin.api';
import { collectionMeta, formatMB } from '../helpers/dbHealthHelpers';

interface DbHealthStackedBarProps {
  collections: DbHealthCollection[];
  totalSize: number;
}

// בר אופקי ארוך שמראה את כל הקולקציות יחד באותו פס - הכי ויזואלי לפרופורציות.
export const DbHealthStackedBar = ({ collections, totalSize }: DbHealthStackedBarProps) => (
  <Box sx={{ display: 'flex', height: 24, borderRadius: 2, overflow: 'hidden', mb: 1 }}>
    {collections.map((c) => {
      const collTotal = c.storageSize + c.indexSize;
      const pct = (collTotal / totalSize) * 100;
      const meta = collectionMeta(c.name);
      return (
        <Box
          key={c.name}
          title={`${meta.he}: ${formatMB(collTotal)}`}
          sx={{ width: `${pct}%`, bgcolor: meta.color }}
        />
      );
    })}
  </Box>
);
