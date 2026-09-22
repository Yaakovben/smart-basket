import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import { adminApi, type AdminSubscriptionRequest } from '../../../services/api/admin.api';

interface Props {
  isDark: boolean;
  // נקרא אחרי אישור כדי לרענן את טבלת המשתמשים (התוכנית השתנתה).
  onChanged: () => void;
}

const METHOD_LABEL: Record<string, string> = { bit: 'ביט', paybox: 'PayBox', bank: 'העברה' };
const POLL_MS = 25_000;

// בקשות מנוי שממתינות: המשתמש מדווח ששילם, האדמין מאמת מול ההעברה בפועל ומאשר.
// אישור מאריך את המנוי (מסוף התקופה הנוכחית); דחייה שולחת התראה למשתמש. מתעדכן
// אוטומטית ברקע כדי שבקשה חדשה (וגם ה-push שהאדמין קיבל עליה) תיראה מיד כשנכנסים לכאן.
export const SubscriptionRequestsPanel = ({ isDark, onChanged }: Props) => {
  const [items, setItems] = useState<AdminSubscriptionRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await adminApi.getSubscriptionRequests());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const act = async (id: string, kind: 'approve' | 'reject') => {
    let note: string | undefined;
    if (kind === 'reject') {
      const input = window.prompt('סיבת הדחייה (תוצג למשתמש, אפשר להשאיר ריק):');
      if (input === null) return;
      note = input.trim() || undefined;
    } else if (!window.confirm('לאשר? המנוי יופעל/יוארך למשתמש.')) {
      return;
    }
    setBusyId(id);
    try {
      if (kind === 'approve') await adminApi.approveSubscriptionRequest(id, note);
      else await adminApi.rejectSubscriptionRequest(id, note);
      await load();
      if (kind === 'approve') onChanged();
    } catch {
      window.alert('הפעולה נכשלה (ייתכן שכבר טופלה). הרשימה תרוענן.');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (error || !items || items.length === 0) return null;

  const reported = items.filter((i) => i.status === 'reported');
  const waiting = items.filter((i) => i.status === 'pending');
  const hasReported = reported.length > 0;

  const Row = ({ r }: { r: AdminSubscriptionRequest }) => (
    <Box sx={{
      display: 'flex', flexDirection: 'column', gap: 0.75, p: 1.25, mt: 1, borderRadius: '12px',
      bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
      border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(124,58,237,0.15)',
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'baseline' }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14.5 }}>{r.user?.name ?? '?'}</Typography>
        <Typography sx={{ fontWeight: 900, fontSize: 16, color: '#7C3AED' }}>₪{r.amount}</Typography>
      </Box>
      <Typography sx={{ fontSize: 12, color: 'text.secondary' }} dir="ltr">{r.user?.email}</Typography>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
        {r.months} חודשים · {METHOD_LABEL[r.method] ?? r.method} · קוד: <b dir="ltr">{r.reference}</b>
        {r.reportedAt ? ` · דווח ${new Date(r.reportedAt).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
      </Typography>
      {r.status === 'reported' && (
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
          <Button size="small" variant="contained" disabled={busyId === r.id} onClick={() => act(r.id, 'approve')}
            sx={{ flex: 1, borderRadius: '10px', fontWeight: 800, bgcolor: '#7C3AED', boxShadow: 'none', '&:hover': { bgcolor: '#6D28D9', boxShadow: 'none' } }}>
            {busyId === r.id ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'אשר והפעל'}
          </Button>
          <Button size="small" variant="outlined" color="error" disabled={busyId === r.id} onClick={() => act(r.id, 'reject')}
            sx={{ borderRadius: '10px', fontWeight: 700 }}>
            דחה
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Paper sx={{
      p: 2, mb: 2, borderRadius: '18px', position: 'relative', overflow: 'hidden',
      border: '1.5px solid', borderColor: hasReported ? '#7C3AED' : 'divider',
      bgcolor: isDark ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.04)',
      boxShadow: hasReported ? '0 4px 18px rgba(124,58,237,0.22)' : 'none',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1 }}>
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #8B5CF6, #5B21B6)',
          }}>
            <PaymentsRoundedIcon sx={{ fontSize: 20, color: '#fff' }} />
          </Box>
          {hasReported && (
            <Box aria-hidden sx={{
              position: 'absolute', top: -3, insetInlineEnd: -3, width: 14, height: 14, borderRadius: '50%',
              bgcolor: '#DC2626', border: '2px solid', borderColor: isDark ? '#1E1B2E' : '#fff',
              animation: 'sbAdminPingRing 1.8s ease-out infinite',
              '@keyframes sbAdminPingRing': {
                '0%': { boxShadow: '0 0 0 0 rgba(220,38,38,0.55)' },
                '70%, 100%': { boxShadow: '0 0 0 8px rgba(220,38,38,0)' },
              },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }} />
          )}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 15 }}>
            בקשות מנוי {hasReported && <Box component="span" sx={{ color: '#7C3AED' }}>· {reported.length} ממתינות לאישור</Box>}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            אשר רק אחרי שראית את ההעברה בפועל בביט/בבנק עם קוד ההפניה.
          </Typography>
        </Box>
      </Box>
      {reported.map((r) => <Row key={r.id} r={r} />)}
      {waiting.length > 0 && (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 1.5 }}>
          {waiting.length} בקשות נוספות נפתחו ועדיין לא דווח בהן תשלום.
        </Typography>
      )}
    </Paper>
  );
};
