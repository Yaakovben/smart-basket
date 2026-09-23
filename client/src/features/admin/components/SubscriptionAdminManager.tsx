import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import { adminApi, type AdminSubscriptionRequest } from '../../../services/api/admin.api';
import { DbHealthHeader } from './DbHealthHeader';
import { LegacyTrialGrantCard } from './LegacyTrialGrantCard';
import { PRO_PURPLE, PRO_PURPLE_DARK } from '../../subscription/subscription.styles';

interface Props {
  isDark: boolean;
  onClose: () => void;
  // נקרא אחרי אישור/מענק כדי לרענן את טבלת המשתמשים (התוכנית השתנתה).
  onChanged: () => void;
}

type SubTab = 'pending' | 'history';

const METHOD_LABEL: Record<string, string> = { bit: 'ביט', paybox: 'PayBox', bank: 'העברה' };
const POLL_MS = 25_000;

const STATUS_STYLE: Record<AdminSubscriptionRequest['status'], { label: string; color: string }> = {
  pending: { label: 'ממתין לתשלום', color: '#6B7280' },
  reported: { label: 'דווח - ממתין לאישור', color: PRO_PURPLE },
  approved: { label: 'אושר', color: '#059669' },
  rejected: { label: 'נדחה', color: '#DC2626' },
  cancelled: { label: 'בוטל', color: '#6B7280' },
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

// מסך ניהול מנוי ייעודי לאדמין - כל מה שקשור לתשלומים ולמענקי Pro במקום
// אחד, לא כרטיס שקוף שדוחק תוכן אחר בדשבורד. שני טאבים: בקשות שממתינות
// לפעולה (עם התראה אמיתית - רק כשבאמת יש דיווח תשלום חדש), והיסטוריית כל
// הבקשות שנפתחו אי-פעם.
export const SubscriptionAdminManager = ({ isDark, onClose, onChanged }: Props) => {
  const [tab, setTab] = useState<SubTab>('pending');
  const [pendingItems, setPendingItems] = useState<AdminSubscriptionRequest[] | null>(null);
  const [historyItems, setHistoryItems] = useState<AdminSubscriptionRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const loadPending = useCallback(async () => {
    try {
      setPendingItems(await adminApi.getSubscriptionRequests());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryItems(await adminApi.getSubscriptionRequests(true));
    } catch { /* הטאב פשוט נשאר בטעינה - לא קריטי */ }
  }, []);

  // בקשות ממתינות מתעדכנות אוטומטית ברקע - כדי שדיווח תשלום חדש (וה-push
  // שהאדמין כבר קיבל עליו) יופיע כאן מיד. היסטוריה נטענת פעם אחת, ומחדש
  // אחרי כל פעולה (act) שמשנה אותה.
  useEffect(() => {
    void loadPending();
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void loadPending(); }, POLL_MS);
    return () => window.clearInterval(id);
  }, [loadPending]);

  useEffect(() => { if (tab === 'history' && historyItems === null) void loadHistory(); }, [tab, historyItems, loadHistory]);

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
      await loadPending();
      setHistoryItems(null); // ירענן בפעם הבאה שנכנסים לטאב
      if (kind === 'approve') onChanged();
    } catch {
      window.alert('הפעולה נכשלה (ייתכן שכבר טופלה). הרשימה תרוענן.');
      await loadPending();
    } finally {
      setBusyId(null);
    }
  };

  const reported = (pendingItems ?? []).filter((i) => i.status === 'reported');
  const waiting = (pendingItems ?? []).filter((i) => i.status === 'pending');

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 2000,
      bgcolor: isDark ? '#0F172A' : '#F8FAFC',
      display: 'flex', flexDirection: 'column',
      pt: 'env(safe-area-inset-top)',
    }}>
      <DbHealthHeader
        onClose={onClose}
        icon={<WorkspacePremiumRoundedIcon sx={{ color: PRO_PURPLE }} />}
        title="ניהול מנוי"
        meta={reported.length > 0
          ? <Typography sx={{ fontSize: 11, fontWeight: 800, color: PRO_PURPLE }}>{reported.length} ממתינות לאישור</Typography>
          : undefined}
      />

      {/* טאבים */}
      <Box sx={{ display: 'flex', gap: 0.75, px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
        {([
          { key: 'pending' as const, label: `ממתינות${reported.length > 0 ? ` (${reported.length})` : ''}` },
          { key: 'history' as const, label: 'היסטוריה' },
        ]).map(({ key, label }) => (
          <Box
            key={key}
            onClick={() => setTab(key)}
            role="button"
            tabIndex={0}
            sx={{
              flex: 1, textAlign: 'center', py: 0.85, borderRadius: '10px', cursor: 'pointer',
              fontSize: 13, fontWeight: 800,
              bgcolor: tab === key ? PRO_PURPLE : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(124,58,237,0.06)'),
              color: tab === key ? '#fff' : 'text.secondary',
              transition: 'background-color 0.15s',
              '&:active': { transform: 'scale(0.98)' },
            }}
          >
            {label}
          </Box>
        ))}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', p: 2 }}>
        {tab === 'pending' ? (
          <>
            <LegacyTrialGrantCard isDark={isDark} onChanged={onChanged} />

            {error ? (
              <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 3 }}>
                לא הצלחנו לטעון בקשות תשלום. גררו למטה לרענן.
              </Typography>
            ) : pendingItems === null ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={22} /></Box>
            ) : reported.length === 0 && waiting.length === 0 ? (
              <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 3 }}>
                אין כרגע בקשות תשלום פתוחות.
              </Typography>
            ) : (
              <>
                {reported.map((r) => (
                  <Box key={r.id} sx={{
                    display: 'flex', flexDirection: 'column', gap: 0.75, p: 1.5, mb: 1.25, borderRadius: '14px',
                    bgcolor: isDark ? 'rgba(124,58,237,0.10)' : '#fff',
                    border: '1.5px solid', borderColor: PRO_PURPLE,
                    boxShadow: isDark ? 'none' : '0 4px 14px rgba(124,58,237,0.14)',
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'baseline' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{r.user?.name ?? '?'}</Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: 17, color: PRO_PURPLE }}>₪{r.amount}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }} dir="ltr">{r.user?.email}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                      {r.months} חודשים · {METHOD_LABEL[r.method] ?? r.method} · קוד: <b dir="ltr">{r.reference}</b>
                      {r.reportedAt ? ` · דווח ${fmtDateTime(r.reportedAt)}` : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Button size="small" variant="contained" disabled={busyId === r.id} onClick={() => act(r.id, 'approve')}
                        sx={{ flex: 1, borderRadius: '10px', fontWeight: 800, bgcolor: PRO_PURPLE, boxShadow: 'none', '&:hover': { bgcolor: PRO_PURPLE_DARK, boxShadow: 'none' } }}>
                        {busyId === r.id ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'אשר והפעל'}
                      </Button>
                      <Button size="small" variant="outlined" color="error" disabled={busyId === r.id} onClick={() => act(r.id, 'reject')}
                        sx={{ borderRadius: '10px', fontWeight: 700 }}>
                        דחה
                      </Button>
                    </Box>
                  </Box>
                ))}
                {waiting.length > 0 && (
                  <Typography sx={{ fontSize: 12, color: 'text.disabled', textAlign: 'center', mt: reported.length > 0 ? 1 : 0 }}>
                    {waiting.length} בקשות נוספות נפתחו ועדיין לא דווח בהן תשלום - אין צורך בפעולה.
                  </Typography>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {historyItems === null ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={22} /></Box>
            ) : historyItems.filter((h) => h.status !== 'pending').length === 0 ? (
              <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 3 }}>
                עדיין אין היסטוריית בקשות.
              </Typography>
            ) : (
              historyItems.filter((h) => h.status !== 'pending').map((h) => (
                <Box key={h.id} sx={{
                  display: 'flex', flexDirection: 'column', gap: 0.4, p: 1.25, mb: 1, borderRadius: '12px',
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                  border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'baseline' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{h.user?.name ?? '?'}</Typography>
                    <Box sx={{
                      px: 1, py: '2px', borderRadius: '999px', fontSize: 10.5, fontWeight: 800,
                      color: STATUS_STYLE[h.status].color, bgcolor: `${STATUS_STYLE[h.status].color}1A`,
                    }}>
                      {STATUS_STYLE[h.status].label}
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                    ₪{h.amount} · {h.months} חודשים · {fmtDateTime(h.resolvedAt ?? h.reportedAt ?? h.createdAt)}
                  </Typography>
                  {h.adminNote && (
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', fontStyle: 'italic' }}>"{h.adminNote}"</Typography>
                  )}
                </Box>
              ))
            )}
          </>
        )}
      </Box>
    </Box>
  );
};
