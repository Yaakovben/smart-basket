import { Box, Typography } from '@mui/material';
import type { DbHealth } from '../../../services/api/admin.api';
import { formatMB } from '../helpers/dbHealthHelpers';

interface DbHealthStatsRowProps {
  data: DbHealth;
  isDark: boolean;
}

// 3 מספרים גדולים לסקירה מהירה: בשימוש / פנוי / סך מסמכים
export const DbHealthStatsRow = ({ data, isDark }: DbHealthStatsRowProps) => {
  const freeBytes = Math.max(0, data.limitMB * 1024 * 1024 - data.totalSize);
  const totalDocs = data.collections.reduce((s, c) => s + c.documents, 0);

  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
      <Box sx={{
        flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center',
        bgcolor: isDark ? 'rgba(20,184,166,0.12)' : '#CCFBF1',
      }}>
        <Typography sx={{ fontSize: 10, color: '#0D9488', fontWeight: 800, letterSpacing: 0.3 }}>
          בשימוש
        </Typography>
        <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0D9488', lineHeight: 1.1 }}>
          {formatMB(data.totalSize)}
        </Typography>
        <Typography sx={{ fontSize: 9.5, color: '#0D9488', opacity: 0.75, mt: 0.25 }}>
          {data.usedPct}%
        </Typography>
      </Box>
      <Box sx={{
        flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center',
        bgcolor: isDark ? 'rgba(59,130,246,0.12)' : '#DBEAFE',
      }}>
        <Typography sx={{ fontSize: 10, color: '#1D4ED8', fontWeight: 800, letterSpacing: 0.3 }}>
          פנוי
        </Typography>
        <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#1D4ED8', lineHeight: 1.1 }}>
          {formatMB(freeBytes)}
        </Typography>
        <Typography sx={{ fontSize: 9.5, color: '#1D4ED8', opacity: 0.75, mt: 0.25 }}>
          {(100 - data.usedPct).toFixed(1)}%
        </Typography>
      </Box>
      <Box sx={{
        flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center',
        bgcolor: isDark ? 'rgba(139,92,246,0.12)' : '#EDE9FE',
      }}>
        <Typography sx={{ fontSize: 10, color: '#6D28D9', fontWeight: 800, letterSpacing: 0.3 }}>
          סך מסמכים
        </Typography>
        <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#6D28D9', lineHeight: 1.1 }}>
          {totalDocs >= 10000 ? `${(totalDocs / 1000).toFixed(0)}K` : totalDocs.toLocaleString('he-IL')}
        </Typography>
        <Typography sx={{ fontSize: 9.5, color: '#6D28D9', opacity: 0.75, mt: 0.25 }}>
          ב-{data.collectionCount} קולקציות
        </Typography>
      </Box>
    </Box>
  );
};
