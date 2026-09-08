import { Box, Typography } from '@mui/material';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import type { CloudinaryHealth } from '../../../services/api/admin.api';
import { statusInfo, formatMB, CLOUDINARY_METRIC_META } from '../helpers/dbHealthHelpers';
import { DbHealthCircularGauge } from './DbHealthCircularGauge';
import { CloudinaryMetricRow } from './CloudinaryMetricRow';

interface Props {
  data: CloudinaryHealth | null;
  isDark: boolean;
}

const fmtNum = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString('he-IL');

// last_updated מ-Cloudinary הוא לרוב תאריך בלבד ("2026-09-07") - הצגת
// שעה עליו נתנה תמיד "00:00" ובלבלה. מציגים תאריך; רק אם המחרוזת כוללת
// שעה אמיתית (ISO datetime) מוסיפים אותה.
const formatCloudinaryAsOf = (raw: string): string => {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw.trim());
  return dateOnly
    ? d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : d.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

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
            Cloudinary מרענן את נתוני השימוש פעם ביום · נכון ל-{formatCloudinaryAsOf(data.lastUpdated)}
          </Typography>
        )}
      </Box>

      {/* מדדים מפורטים - שורה בסגנון "קולקשן" (ראו DbHealthCollectionRow):
          שם אמיתי (כמו ש-Cloudinary עצמו קורא למדד) + שם ידידותי בעברית,
          ולחיצה פותחת הסבר קצר. liveObjectCount (לא data.objects) - ספירה
          חיה מה-DB, לא מ-Cloudinary (שמתעדכן בעיכוב, ראו ההערה למעלה). */}
      {data.storage && (
        <CloudinaryMetricRow meta={CLOUDINARY_METRIC_META.storage} pct={data.storage.pct}
          valueText={data.storage.limitBytes ? `${formatMB(data.storage.usedBytes)} / ${formatMB(data.storage.limitBytes)}` : formatMB(data.storage.usedBytes)} isDark={isDark} />
      )}
      {data.bandwidth && (
        <CloudinaryMetricRow meta={CLOUDINARY_METRIC_META.bandwidth} pct={data.bandwidth.pct}
          valueText={data.bandwidth.limitBytes ? `${formatMB(data.bandwidth.usedBytes)} / ${formatMB(data.bandwidth.limitBytes)}` : formatMB(data.bandwidth.usedBytes)} isDark={isDark} />
      )}
      {data.transformations && (
        <CloudinaryMetricRow meta={CLOUDINARY_METRIC_META.transformations} pct={data.transformations.pct}
          valueText={data.transformations.limit ? `${fmtNum(data.transformations.used)} / ${fmtNum(data.transformations.limit)}` : fmtNum(data.transformations.used)} isDark={isDark} />
      )}
      <CloudinaryMetricRow meta={CLOUDINARY_METRIC_META.objects} pct={null}
        valueText={data.liveObjectCount != null ? fmtNum(data.liveObjectCount) : (data.objects != null ? fmtNum(data.objects) : '—')} isDark={isDark} />
      <CloudinaryMetricRow meta={CLOUDINARY_METRIC_META.requests} pct={null}
        valueText={data.requests != null ? fmtNum(data.requests) : '—'} isDark={isDark} />
    </>
  );
};
