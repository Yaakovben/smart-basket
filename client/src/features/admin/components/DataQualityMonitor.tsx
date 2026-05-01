import { useEffect, useState } from 'react';
import { Box, Typography, IconButton, CircularProgress, Tabs, Tab, Chip, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { priceComparisonApi, type DataQualityReport } from '../../priceComparison/services/priceComparison.api';
import { useSettings } from '../../../global/context/SettingsContext';

interface Props {
  onClose: () => void;
}

// רכיב מודאלי שמציג דוח אימות נתונים: סניפים חשודים, מחירים אנומליים
// וסטטיסטיקות סנכרון לכל רשת. נטען בלחיצה על אייקון בלוח האדמין.
export const DataQualityMonitor = ({ onClose }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<DataQualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const report = await priceComparisonApi.getDataQuality();
      setData(report);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'שגיאה בטעינת הדוח');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 2000,
      bgcolor: isDark ? 'rgba(15,23,42,0.96)' : 'rgba(248,250,252,0.98)',
      display: 'flex', flexDirection: 'column',
      pt: 'env(safe-area-inset-top)',
    }}>
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedIcon sx={{ color: '#0D9488' }} />
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>אימות נתונים</Typography>
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

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab label="סניפים" />
        <Tab label="מחירים" />
        <Tab label="סנכרון" />
      </Tabs>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!loading && data && (
          <>
            {tab === 0 && (
              <Box>
                <SummaryRow label="סה״כ סניפים" value={data.branches.total} ok />
                <SummaryRow label="ללא קואורדינטות" value={data.branches.stats.withoutCoords} warn={data.branches.stats.withoutCoords > 0} />
                <SummaryRow label="קואורדינטות מחוץ לישראל" value={data.branches.stats.outOfBounds} warn={data.branches.stats.outOfBounds > 0} />
                <SummaryRow label="ללא עיר" value={data.branches.stats.withoutCity} />
                <Typography sx={{ mt: 2, mb: 1, fontWeight: 700, fontSize: 14 }}>בעיות שאותרו ({data.branches.issues.length})</Typography>
                {data.branches.issues.length === 0 ? (
                  <Alert severity="success">כל הסניפים תקינים</Alert>
                ) : (
                  data.branches.issues.map((iss) => (
                    <Box key={iss.id} sx={{
                      p: 1.25, mb: 1, borderRadius: 2,
                      bgcolor: isDark ? 'rgba(245,158,11,0.08)' : '#FEF3C7',
                      border: '1px solid', borderColor: isDark ? 'rgba(245,158,11,0.25)' : '#FDE68A',
                    }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{iss.storeName}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {iss.chainId} · {iss.storeId} {iss.city && `· ${iss.city}`}
                      </Typography>
                      {iss.reasons.map((r, i) => (
                        <Chip key={i} size="small" label={r} sx={{ mt: 0.5, mr: 0.5, fontSize: 10 }} />
                      ))}
                    </Box>
                  ))
                )}
              </Box>
            )}

            {tab === 1 && (
              <Box>
                <SummaryRow label="סה״כ מחירים" value={data.prices.total} ok />
                <SummaryRow label="מחיר 0 או שלילי" value={data.prices.stats.zeroOrNegative} err={data.prices.stats.zeroOrNegative > 0} />
                <SummaryRow label="מחיר חריג גבוה" value={data.prices.stats.tooHigh} warn={data.prices.stats.tooHigh > 0} />
                <SummaryRow label="מיושנים (>7 ימים)" value={data.prices.stats.stale} warn={data.prices.stats.stale > 0} />
                <Typography sx={{ mt: 2, mb: 1, fontWeight: 700, fontSize: 14 }}>דוגמאות בעיות ({data.prices.issues.length})</Typography>
                {data.prices.issues.length === 0 ? (
                  <Alert severity="success">לא נמצאו אנומליות במחירים</Alert>
                ) : (
                  data.prices.issues.map((iss, idx) => (
                    <Box key={`${iss.barcode}-${idx}`} sx={{
                      p: 1.25, mb: 1, borderRadius: 2,
                      bgcolor: isDark ? 'rgba(239,68,68,0.08)' : '#FEE2E2',
                      border: '1px solid', borderColor: isDark ? 'rgba(239,68,68,0.25)' : '#FECACA',
                    }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{iss.itemName}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {iss.chainId} · {iss.barcode} · ₪{iss.price}
                      </Typography>
                      <Chip size="small" label={iss.reason} sx={{ mt: 0.5, fontSize: 10 }} />
                    </Box>
                  ))
                )}
              </Box>
            )}

            {tab === 2 && (
              <Box>
                {data.sync.map((s) => {
                  const stale = s.freshnessHours !== null && s.freshnessHours > 24;
                  const failed = !!s.lastSyncResult?.error;
                  return (
                    <Box key={s.chainId} sx={{
                      p: 1.5, mb: 1.25, borderRadius: 2,
                      bgcolor: 'background.paper',
                      border: '1px solid', borderColor: failed ? 'error.main' : (stale ? 'warning.main' : 'divider'),
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontWeight: 700 }}>{s.chainName}</Typography>
                        {failed ? <ErrorOutlineIcon color="error" fontSize="small" /> : stale ? <WarningAmberIcon color="warning" fontSize="small" /> : <VerifiedIcon sx={{ color: '#10B981' }} fontSize="small" />}
                      </Box>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {s.totalPrices.toLocaleString('he-IL')} מחירים · {s.totalBranches} סניפים
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
                        עדכון אחרון: {fmtDate(s.newestPriceAt)} {s.freshnessHours !== null && `· (${s.freshnessHours}ש)`}
                      </Typography>
                      {s.lastSyncResult && (
                        <Typography sx={{ fontSize: 11, color: failed ? 'error.main' : 'text.secondary', mt: 0.25 }}>
                          sync: {s.lastSyncResult.fetched}↓ {s.lastSyncResult.upserted}↑ ({(s.lastSyncResult.elapsedMs / 1000).toFixed(1)}s)
                          {s.lastSyncResult.error && ` — ${s.lastSyncResult.error}`}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

interface SummaryRowProps {
  label: string;
  value: number;
  ok?: boolean;
  warn?: boolean;
  err?: boolean;
}
const SummaryRow = ({ label, value, ok, warn, err }: SummaryRowProps) => {
  const color = err ? 'error.main' : warn ? 'warning.main' : ok ? 'success.main' : 'text.primary';
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
      <Typography sx={{ fontSize: 13 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color }}>{value.toLocaleString('he-IL')}</Typography>
    </Box>
  );
};
