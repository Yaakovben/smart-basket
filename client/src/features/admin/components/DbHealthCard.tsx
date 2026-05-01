import { useEffect, useState } from 'react';
import { Box, Typography, LinearProgress, IconButton, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageIcon from '@mui/icons-material/Storage';
import CloseIcon from '@mui/icons-material/Close';
import { adminApi, type DbHealth } from '../../../services/api/admin.api';

interface Props {
  isDark: boolean;
  onClose: () => void;
}

// מודאל מלא-מסך שמציג שימוש ב-MongoDB: גודל כולל, פירוט קולקציות,
// ואחוז ניצול מול הסף. נפתח מכפתור באדמין (אייקון Storage).
export const DbHealthCard = ({ isDark, onClose }: Props) => {
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
      position: 'fixed', inset: 0, zIndex: 2000,
      bgcolor: isDark ? 'rgba(15,23,42,0.98)' : 'rgba(248,250,252,0.98)',
      display: 'flex', flexDirection: 'column',
      pt: 'env(safe-area-inset-top)',
    }}>
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon sx={{ color: '#0D9488' }} />
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>שימוש ב-MongoDB</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton onClick={load} disabled={loading} aria-label="רענון">
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={onClose} aria-label="סגירה">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, pb: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        {loading && !data && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {data && (
          <>
            {/* מד ניצול ראשי */}
            <Box sx={{
              p: 2, borderRadius: 2, mb: 2,
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
              border: '1px solid', borderColor: 'divider',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>
                  {formatMB(data.totalSize)} מתוך {data.limitMB} MB
                </Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 800, color: colorByStatus(data.status) }}>
                  {data.usedPct}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, data.usedPct)}
                sx={{
                  height: 12, borderRadius: 6,
                  bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  '& .MuiLinearProgress-bar': { bgcolor: colorByStatus(data.status), borderRadius: 6 },
                }}
              />
              <Typography sx={{ fontSize: 12, color: colorByStatus(data.status), mt: 1, fontWeight: 700 }}>
                {data.status === 'critical' && '⚠️ ניצול קריטי - לשקול שדרוג Plan או הקטנת TTL'}
                {data.status === 'warning' && '⚡ ניצול גבוה - לעקוב מקרוב'}
                {data.status === 'ok' && '✓ תקין - יש מקום זמין'}
              </Typography>
            </Box>

            {/* פירוט גודל */}
            <Box sx={{ display: 'flex', mb: 2, gap: 1 }}>
              <Box sx={{ flex: 1, p: 1.25, borderRadius: 1.5, bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', textAlign: 'center' }}>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700 }}>נתונים</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{formatMB(data.storageSize)}</Typography>
              </Box>
              <Box sx={{ flex: 1, p: 1.25, borderRadius: 1.5, bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', textAlign: 'center' }}>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700 }}>אינדקסים</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{formatMB(data.indexSize)}</Typography>
              </Box>
              <Box sx={{ flex: 1, p: 1.25, borderRadius: 1.5, bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', textAlign: 'center' }}>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700 }}>קולקציות</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{data.collectionCount}</Typography>
              </Box>
            </Box>

            {/* רשימת קולקציות */}
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.disabled', mb: 1, letterSpacing: 0.3 }}>
              פירוט קולקציות ({data.collections.length})
            </Typography>
            {data.collections.map((c) => {
              const collTotal = c.storageSize + c.indexSize;
              const collPct = (collTotal / data.totalSize) * 100;
              return (
                <Box key={c.name} sx={{
                  mb: 1, p: 1.25, borderRadius: 1.5,
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
                  border: '1px solid', borderColor: 'divider',
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{c.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {formatMB(collTotal)} · {c.documents.toLocaleString('he-IL')} מסמכים
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, collPct)}
                    sx={{
                      height: 5, borderRadius: 2.5,
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
    </Box>
  );
};
