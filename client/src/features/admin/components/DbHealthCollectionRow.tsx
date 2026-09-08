import { Box, Typography } from '@mui/material';
import type { DbHealthCollection } from '../../../services/api/admin.api';
import { collectionMeta, formatMB } from '../helpers/dbHealthHelpers';

interface DbHealthCollectionRowProps {
  collection: DbHealthCollection;
  totalSize: number;
  isDark: boolean;
}

// שורת פירוט קולקציה בודדת ברשימה המלאה
export const DbHealthCollectionRow = ({ collection: c, totalSize, isDark }: DbHealthCollectionRowProps) => {
  const meta = collectionMeta(c.name);
  const Icon = meta.icon;
  const collTotal = c.storageSize + c.indexSize;
  const collPct = (collTotal / totalSize) * 100;

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      mb: 1, p: 1.5, borderRadius: 2,
      bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
      border: '1px solid', borderColor: 'divider',
    }}>
      <Box sx={{
        width: 40, height: 40, borderRadius: '50%',
        bgcolor: meta.color + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon sx={{ color: meta.color, fontSize: 22 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
          {/* השם האמיתי של הקולקציה (monospace, כמו ב-DB) + השם הידידותי */}
          <Box sx={{ minWidth: 0 }}>
            <Typography component="span" sx={{ fontSize: 13.5, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>
              {c.name}
            </Typography>
            <Typography component="span" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', ml: 0.75 }}>
              {meta.he}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: meta.color, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {formatMB(collTotal)}
          </Typography>
        </Box>
        {/* מה הקולקציה שומרת - בקטן */}
        <Typography sx={{ fontSize: 10, color: 'text.disabled', lineHeight: 1.3, mt: 0.1 }}>
          {meta.desc}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.35 }}>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {c.documents.toLocaleString('he-IL')} מסמכים
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700 }}>
            {collPct.toFixed(1)}% מהאחסון
          </Typography>
        </Box>
        <Box sx={{
          height: 4, borderRadius: 2, mt: 0.5, overflow: 'hidden',
          bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        }}>
          <Box sx={{
            width: `${Math.min(100, collPct)}%`,
            height: '100%',
            bgcolor: meta.color,
            transition: 'width 0.4s ease',
          }} />
        </Box>
      </Box>
    </Box>
  );
};
