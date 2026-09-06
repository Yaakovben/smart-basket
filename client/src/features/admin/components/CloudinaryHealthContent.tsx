import { Box, Typography } from '@mui/material';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import type { CloudinaryHealth } from '../../../services/api/admin.api';
import { statusInfo, formatMB } from '../helpers/dbHealthHelpers';
import { DbHealthCircularGauge } from './DbHealthCircularGauge';

interface Props {
  data: CloudinaryHealth | null;
  isDark: boolean;
}

const fmtNum = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString('he-IL');

// שורת מדד עם פס התקדמות - אחסון / תעבורה / טרנספורמציות.
const MetricBar = ({ label, valueText, pct, color, isDark }: { label: string; valueText: string; pct: number | null; color: string; isDark: boolean }) => (
  <Box sx={{ mb: 1.25 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.4 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>
        {valueText}
        {pct != null && <Box component="span" sx={{ fontSize: 10.5, color: 'text.disabled', ml: 0.5 }}>({pct}%)</Box>}
      </Typography>
    </Box>
    <Box sx={{ height: 7, borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      <Box sx={{ height: '100%', width: `${Math.min(100, pct ?? 0)}%`, bgcolor: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
    </Box>
  </Box>
);

export const CloudinaryHealthContent = ({ data, isDark }: Props) => {
  if (!data) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>לא ניתן לטעון את נתוני Cloudinary</Typography>
        <Typography sx={{ fontSize: 12, mt: 0.5 }}>נסה לרענן</Typography>
      </Box>
    );
  }

  if (!data.configured) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
        <CloudOffIcon sx={{ fontSize: 40, opacity: 0.5, mb: 1 }} />
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Cloudinary לא מוגדר בשרת הזה</Typography>
        <Typography sx={{ fontSize: 12, mt: 0.5 }}>תמונות מוצרים נשמרות כ-data-URL בתוך המסמך</Typography>
      </Box>
    );
  }

  const status = statusInfo(data.status ?? 'ok', isDark);
  const StatusIcon = status.icon;
  const credits = data.credits ?? { used: 0, limit: 0, pct: 0 };

  return (
    <>
      {/* Hero - גאוג' על ה-credits (המדד המאוחד של Cloudinary) */}
      <Box sx={{
        p: 3, borderRadius: 3, mb: 2, textAlign: 'center',
        bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
        border: '1px solid', borderColor: 'divider',
      }}>
        <DbHealthCircularGauge percent={credits.pct} color={status.color} isDark={isDark} />
        <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: status.bg, display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          <StatusIcon sx={{ color: status.color, fontSize: 22 }} />
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: status.color, lineHeight: 1.2 }}>{status.title}</Typography>
            <Typography sx={{ fontSize: 11, color: status.color, opacity: 0.85, lineHeight: 1.2 }}>{status.subtitle}</Typography>
          </Box>
        </Box>
        <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1.5 }}>
          <b>{credits.used.toFixed(2)}</b> מתוך <b>{credits.limit}</b> credits בשימוש החודש
        </Typography>
        {data.lastUpdated && (
          <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mt: 0.5 }}>
            נתוני Cloudinary נכונים ל-{new Date(data.lastUpdated).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </Typography>
        )}
      </Box>

      {/* מדדים מפורטים */}
      <Box sx={{
        p: 2, borderRadius: 3, mb: 2,
        bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
        border: '1px solid', borderColor: 'divider',
      }}>
        {data.storage && (
          <MetricBar label="אחסון" color="#0D9488" isDark={isDark} pct={data.storage.pct}
            valueText={data.storage.limitBytes ? `${formatMB(data.storage.usedBytes)} / ${formatMB(data.storage.limitBytes)}` : formatMB(data.storage.usedBytes)} />
        )}
        {data.bandwidth && (
          <MetricBar label="תעבורה (החודש)" color="#3B82F6" isDark={isDark} pct={data.bandwidth.pct}
            valueText={data.bandwidth.limitBytes ? `${formatMB(data.bandwidth.usedBytes)} / ${formatMB(data.bandwidth.limitBytes)}` : formatMB(data.bandwidth.usedBytes)} />
        )}
        {data.transformations && (
          <MetricBar label="טרנספורמציות (החודש)" color="#8B5CF6" isDark={isDark} pct={data.transformations.pct}
            valueText={data.transformations.limit ? `${fmtNum(data.transformations.used)} / ${fmtNum(data.transformations.limit)}` : fmtNum(data.transformations.used)} />
        )}
      </Box>

      {/* סטטים קטנים */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center', bgcolor: isDark ? 'rgba(20,184,166,0.12)' : '#CCFBF1' }}>
          <Typography sx={{ fontSize: 10, color: '#0D9488', fontWeight: 800 }}>קבצים מאוחסנים</Typography>
          <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0D9488', lineHeight: 1.1 }}>
            {data.objects != null ? fmtNum(data.objects) : '—'}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center', bgcolor: isDark ? 'rgba(59,130,246,0.12)' : '#DBEAFE' }}>
          <Typography sx={{ fontSize: 10, color: '#1D4ED8', fontWeight: 800 }}>בקשות (החודש)</Typography>
          <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#1D4ED8', lineHeight: 1.1 }}>
            {data.requests != null ? fmtNum(data.requests) : '—'}
          </Typography>
        </Box>
      </Box>
    </>
  );
};
