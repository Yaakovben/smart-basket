import { useEffect, useState } from 'react';
import { Box, Typography, LinearProgress, IconButton, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageIcon from '@mui/icons-material/Storage';
import { adminApi, type DbHealth } from '../../../services/api/admin.api';

interface Props {
  isDark: boolean;
}

// כרטיסיה שמציגה שימוש בנפח MongoDB - גודל כולל, אחוז ניצול מול הסף, ופירוט פר-קולקציה.
// מציינת מצב בצבע: ירוק (תקין) / כתום (אזהרה) / אדום (קריטי).
export const DbHealthCard = ({ isDark }: Props) => {
  const [data, setData] = useState<DbHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.getDbHealth();
      setData(r);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  const colorByStatus = (s: 'ok' | 'warning' | 'critical') =>
    s === 'critical' ? '#DC2626' : s === 'warning' ? '#D97706' : '#10B981';

  return (
    <Box sx={{
      mt: 2, p: 2, borderRadius: 2,
      bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
      border: '1px solid', borderColor: 'divider',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1 }}>
        <StorageIcon sx={{ color: '#0D9488', fontSize: 20 }} />
        <Typography sx={{ fontSize: 14, fontWeight: 800, flex: 1 }}>שימוש ב-MongoDB</Typography>
        <IconButton size="small" onClick={load} disabled={loading} aria-label="רענון">
          <RefreshIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {loading && !data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      )}

      {data && (
        <>
          {/* מד ניצול ראשי */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                {formatMB(data.totalSize)} מתוך {data.limitMB} MB
              </Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: colorByStatus(data.status) }}>
                {data.usedPct}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, data.usedPct)}
              sx={{
                height: 10, borderRadius: 5,
                bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: colorByStatus(data.status),
                  borderRadius: 5,
                },
              }}
            />
            <Typography sx={{ fontSize: 11, color: colorByStatus(data.status), mt: 0.5, fontWeight: 700 }}>
              {data.status === 'critical' && '⚠️ ניצול קריטי - לשקול שדרוג Plan או הקטנת TTL'}
              {data.status === 'warning' && '⚡ ניצול גבוה - לעקוב מקרוב'}
              {data.status === 'ok' && '✓ תקין - יש מקום זמין'}
            </Typography>
          </Box>

          {/* פירוט גודל */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
            <Box sx={{ flex: 1, p: 1, borderRadius: 1, bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700 }}>נתונים</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formatMB(data.storageSize)}</Typography>
            </Box>
            <Box sx={{ flex: 1, p: 1, borderRadius: 1, bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700 }}>אינדקסים</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formatMB(data.indexSize)}</Typography>
            </Box>
            <Box sx={{ flex: 1, p: 1, borderRadius: 1, bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700 }}>קולקציות</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{data.collectionCount}</Typography>
            </Box>
          </Box>

          {/* טבלת קולקציות - ממוינת לפי גודל */}
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.disabled', mb: 0.5, letterSpacing: 0.3 }}>
            פירוט (5 הגדולות):
          </Typography>
          {data.collections.slice(0, 5).map((c) => {
            const collTotal = c.storageSize + c.indexSize;
            const collPct = (collTotal / data.totalSize) * 100;
            return (
              <Box key={c.name} sx={{ mb: 0.75 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{c.name}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {formatMB(collTotal)} · {c.documents.toLocaleString('he-IL')} מסמכים
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, collPct)}
                  sx={{
                    height: 4, borderRadius: 2, mt: 0.25,
                    bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#14B8A6' },
                  }}
                />
              </Box>
            );
          })}
        </>
      )}
    </Box>
  );
};
