import { Box, Typography } from '@mui/material';
import type { DbHealth } from '../../../services/api/admin.api';
import { formatMB } from '../helpers/dbHealthHelpers';

interface DbHealthSummaryBreakdownProps {
  data: DbHealth;
  isDark: boolean;
}

// סיכום כללי - שקיפות מלאה ל-Free Tier: בר תלת-חלקי (נתונים/אינדקסים/פנוי) + הסבר טקסטואלי
export const DbHealthSummaryBreakdown = ({ data, isDark }: DbHealthSummaryBreakdownProps) => {
  const limitBytes = data.limitMB * 1024 * 1024;
  const dataPct = (data.storageSize / limitBytes) * 100;
  const indexPct = (data.indexSize / limitBytes) * 100;
  const freePct = Math.max(0, 100 - dataPct - indexPct);
  const freeBytes = Math.max(0, limitBytes - data.totalSize);

  return (
    <Box sx={{
      p: 2, borderRadius: 2, mb: 2,
      bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
      border: '1px solid', borderColor: 'divider',
    }}>
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.secondary', mb: 1.5, letterSpacing: 0.3 }}>
        סיכום כולל
      </Typography>

      {/* בר תלת-חלקי: נתונים | אינדקסים | פנוי */}
      <Box sx={{ display: 'flex', height: 28, borderRadius: 2, overflow: 'hidden', mb: 1 }}>
        <Box sx={{ width: `${dataPct}%`, bgcolor: '#0D9488' }} title={`נתונים: ${formatMB(data.storageSize)}`} />
        <Box sx={{ width: `${indexPct}%`, bgcolor: '#F59E0B' }} title={`אינדקסים: ${formatMB(data.indexSize)}`} />
        <Box sx={{ width: `${freePct}%`, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }} title={`פנוי: ${formatMB(freeBytes)}`} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#0D9488' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>נתונים {dataPct.toFixed(1)}%</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#F59E0B' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>אינדקסים {indexPct.toFixed(1)}%</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>פנוי {freePct.toFixed(1)}%</Typography>
        </Box>
      </Box>

      {/* שורת מידע על ה-Tier */}
      <Box sx={{
        mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider',
        fontSize: 11, color: 'text.secondary', lineHeight: 1.5,
      }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
          💡 מה זה אומר?
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
          • <b>Atlas Free Tier</b> נותן {data.limitMB}MB סה״כ (נתונים+אינדקסים).
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
          • כשמגיעים ל-90%+ MongoDB מתחיל לחסום כתיבות חדשות.
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
          • TTL ב-prices מוחק רשומות מעל 14 ימים אוטומטית.
        </Typography>
        {data.usedPct > 70 && (
          <Typography sx={{ fontSize: 11, color: '#D97706', fontWeight: 700, mt: 0.5 }}>
            ⚠️ אם נמשיך לגדול - שדרוג ל-M2 (2GB, $9/חודש) או M5 (5GB, $25/חודש).
          </Typography>
        )}
      </Box>
    </Box>
  );
};
