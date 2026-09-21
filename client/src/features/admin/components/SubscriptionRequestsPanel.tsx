import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material';
import { adminApi, type AdminSubscriptionRequest } from '../../../services/api/admin.api';

interface Props {
  isDark: boolean;
  // נקרא אחרי אישור כדי לרענן את טבלת המשתמשים (התוכנית השתנתה).
  onChanged: () => void;
}

const METHOD_LABEL: Record<string, string> = { bit: 'ביט', paybox: 'PayBox', bank: 'העברה' };

// בקשות מנוי שממתינות: המשתמש מדווח ששילם, האדמין מאמת מול ההעברה בפועל ומאשר.
// אישור מאריך את המנוי (מסוף התקופה הנוכחית); דחייה שולחת התראה למשתמש.
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

  useEffect(() => { void load(); }, [load]);

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

  const Row = ({ r }: { r: AdminSubscriptionRequest }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'baseline' }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14.5 }}>{r.user?.name ?? '?'}</Typography>
        <Typography sx={{ fontWeight: 900, fontSize: 15, color: '#7C3AED' }}>₪{r.amount}</Typography>
      </Box>
      <Typography sx={{ fontSize: 12, color: 'text.secondary' }} dir="ltr">{r.user?.email}</Typography>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
        {r.months} חודשים · {METHOD_LABEL[r.method] ?? r.method} · קוד: <b dir="ltr">{r.reference}</b>
        {r.reportedAt ? ` · דווח ${new Date(r.reportedAt).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
      </Typography>
      {r.status === 'reported' && (
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
          <Button size="small" variant="contained" disabled={busyId === r.id} onClick={() => act(r.id, 'approve')}
            sx={{ flex: 1, borderRadius: '10px', fontWeight: 700, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
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
      p: 2, mb: 2, borderRadius: '16px',
      border: '1.5px solid', borderColor: reported.length ? 'rgba(124,58,237,0.5)' : 'divider',
      bgcolor: isDark ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.04)',
    }}>
      <Typography sx={{ fontWeight: 800, fontSize: 15, mb: 0.25 }}>
        💳 בקשות מנוי {reported.length > 0 && <Box component="span" sx={{ color: '#7C3AED' }}>({reported.length} ממתינות לאישור)</Box>}
      </Typography>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
        אשר רק אחרי שראית את ההעברה בפועל בביט/בבנק עם קוד ההפניה.
      </Typography>
      {reported.map((r) => <Row key={r.id} r={r} />)}
      {waiting.length > 0 && (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 1.5 }}>
          {waiting.length} בקשות נוספות נפתחו ועדיין לא דווח בהן תשלום.
        </Typography>
      )}
    </Paper>
  );
};
