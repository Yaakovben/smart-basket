import { Typography } from '@mui/material';
import type { DbHealth } from '../../../services/api/admin.api';
import { DbHealthCollectionRow } from './DbHealthCollectionRow';

interface DbHealthCollectionsListProps {
  data: DbHealth;
  isDark: boolean;
}

// רשימת קולקציות מפורטת - שורה לכל קולקציה עם גודל, מסמכים ואחוז
export const DbHealthCollectionsList = ({ data, isDark }: DbHealthCollectionsListProps) => (
  <>
    <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.disabled', mb: 1, letterSpacing: 0.3 }}>
      פירוט מלא ({data.collections.length} קולקציות)
    </Typography>
    {data.collections.map((c) => (
      <DbHealthCollectionRow key={c.name} collection={c} totalSize={data.totalSize} isDark={isDark} />
    ))}
  </>
);
