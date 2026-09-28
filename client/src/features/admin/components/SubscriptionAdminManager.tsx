import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography, Button, CircularProgress, ButtonBase } from '@mui/material';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import { adminApi, type AdminSubscriptionRequest } from '../../../services/api/admin.api';
import type { AdminUser } from '../../../services/api';
import { DbHealthHeader } from './DbHealthHeader';
import { LegacyTrialGrantCard } from './LegacyTrialGrantCard';
import { AdminPushToggle } from './AdminPushToggle';
import { ProPill } from './ProPill';
import { PRO_PURPLE, PRO_PURPLE_DARK, PRO_SOFT } from '../../subscription/subscription.styles';
import { adminPageSx } from '../styles/adminPage.styles';
import { proKindOf, proDaysLeft, type ProKind } from '../helpers/adminDashboardHelpers';
import { loadAdminUsers, peekAdminUsers, subscribeAdminUsers } from '../hooks/useAdminDashboard';

interface Props {
  isDark: boolean;
  onClose: () => void;
  // נקרא אחרי אישור/מענק כדי לרענן את טבלת המשתמשים (התוכנית השתנתה).
  onChanged: () => void;
}

type Filter = 'all' | ProKind | 'ending';

const ENDING_DAYS = 7;
const METHOD_LABEL: Record<string, string> = { bit: 'ביט', paybox: 'PayBox', bank: 'העברה' };

const KIND_LABEL: Record<ProKind, string> = {
  store: 'חנות',
  trial: 'ניסיון',
  granted: 'ידני',
  permanent: 'קבוע',
};

interface Subscriber {
  user: AdminUser;
  kind: ProKind;
  daysLeft: number | null;
}

// מסך ניהול המנויים של האדמין. Pro נרכש רק דרך App Store / Google Play, אז
// כאן אין אישורי תשלום: רואים מי מנוי, מאיזה מקור, כמה זמן נשאר ואם החידוש
// פעיל. הנתונים הם אותם נתוני משתמשים של הדשבורד (מטמון משותף, מוצג מיד).
// בקשות תשלום ידניות ישנות שכבר דווחו כשולמו מוצגות רק אם עוד יש כאלה.
export const SubscriptionAdminManager = ({ isDark, onClose, onChanged }: Props) => {
  const [users, setUsers] = useState<AdminUser[] | null>(peekAdminUsers);
  const [usersError, setUsersError] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [legacy, setLegacy] = useState<AdminSubscriptionRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAdminUsers(setUsers);
    loadAdminUsers().then(setUsers).catch(() => setUsersError(true));
    return unsubscribe;
  }, []);

  const loadLegacy = useCallback(async () => {
    try {
      setLegacy((await adminApi.getSubscriptionRequests()).filter((r) => r.status === 'reported'));
    } catch { /* לא קריטי: פשוט לא מוצג */ }
  }, []);
  useEffect(() => { void loadLegacy(); }, [loadLegacy]);

  const subscribers = useMemo<Subscriber[]>(() => (users ?? [])
    .map((user) => ({ user, kind: proKindOf(user), daysLeft: proDaysLeft(user) }))
    .filter((s): s is Subscriber => s.kind !== null)
    // הקרובים לסיום קודם, מנויים קבועים בסוף
    .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity)), [users]);

  const counts = useMemo(() => {
    const c = { all: subscribers.length, store: 0, trial: 0, granted: 0, permanent: 0, ending: 0, renewOff: 0 };
    for (const s of subscribers) {
      c[s.kind]++;
      if (s.daysLeft !== null && s.daysLeft <= ENDING_DAYS && !(s.kind === 'store' && s.user.planAutoRenew)) c.ending++;
      if (s.kind === 'store' && s.user.planAutoRenew === false) c.renewOff++;
    }
    return c;
  }, [subscribers]);

  const shown = subscribers.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'ending') return s.daysLeft !== null && s.daysLeft <= ENDING_DAYS && !(s.kind === 'store' && s.user.planAutoRenew);
    return s.kind === filter;
  });

  const actLegacy = async (id: string, kind: 'approve' | 'reject') => {
    let note: string | undefined;
    if (kind === 'reject') {
      const input = window.prompt('סיבת הדחייה (תוצג למשתמש, אפשר להשאיר ריק):');
      if (input === null) return;
      note = input.trim() || undefined;
    } else if (!window.confirm('לאשר? המנוי יופעל או יוארך למשתמש.')) {
      return;
    }
    setBusyId(id);
    try {
      if (kind === 'approve') await adminApi.approveSubscriptionRequest(id, note);
      else await adminApi.rejectSubscriptionRequest(id, note);
      await loadLegacy();
      if (kind === 'approve') { onChanged(); void loadAdminUsers(true); }
    } catch {
      window.alert('הפעולה נכשלה (ייתכן שכבר טופלה). הרשימה תרוענן.');
      await loadLegacy();
    } finally {
      setBusyId(null);
    }
  };

  const tileSx = {
    flex: 1, minWidth: 0, p: 1.25, borderRadius: '14px', textAlign: 'center',
    bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
    border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)',
  } as const;

  const tile = (value: number, label: string, accent?: string) => (
    <Box sx={tileSx}>
      <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1.1, color: accent ?? 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
        {users ? value : '–'}
      </Typography>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', mt: 0.3 }}>{label}</Typography>
    </Box>
  );

  const chip = (key: Filter, label: string, count: number) => {
    const active = filter === key;
    return (
      <ButtonBase
        key={key}
        onClick={() => setFilter(key)}
        aria-pressed={active}
        sx={{
          flexShrink: 0, px: 1.4, height: 30, borderRadius: '999px', gap: 0.6,
          fontSize: 12, fontWeight: 700,
          bgcolor: active ? PRO_PURPLE : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(124,58,237,0.07)'),
          color: active ? '#fff' : 'text.secondary',
          transition: 'background-color 0.15s',
        }}
      >
        {label}
        <Box component="span" sx={{ fontSize: 11, opacity: 0.8, fontVariantNumeric: 'tabular-nums' }}>{count}</Box>
      </ButtonBase>
    );
  };

  const statusLine = (s: Subscriber) => {
    if (s.kind === 'permanent') return 'ללא תפוגה';
    const days = s.daysLeft === 0 ? 'מסתיים היום' : s.daysLeft === 1 ? 'יום אחד' : `${s.daysLeft} ימים`;
    if (s.kind === 'store') return `${days} · ${s.user.planAutoRenew ? 'מתחדש אוטומטית' : 'החידוש בוטל'}`;
    return days;
  };

  return (
    <Box sx={adminPageSx(isDark)}>
      <DbHealthHeader
        onClose={onClose}
        icon={<WorkspacePremiumRoundedIcon sx={{ color: PRO_PURPLE }} />}
        title="ניהול מנוי"
        meta={users
          ? <Typography sx={{ fontSize: 11, fontWeight: 800, color: PRO_PURPLE }}>{counts.all} מנויים פעילים</Typography>
          : undefined}
      />

      <Box sx={{
        flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', p: 2,
        pb: 'calc(24px + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', gap: 1.5, '& > *': { flexShrink: 0 },
      }}>
        {/* מתג ההתראות תמיד ראשון, כמו במסך המשוב. mb:0 כי המרווח מגיע מה-gap */}
        <Box sx={{ '& > *': { mb: '0 !important' } }}>
          <AdminPushToggle
            kind="pushOnSubscription"
            label="התראת פוש על מנוי חדש"
            hint="כשמשתמש מצטרף ל-Pro דרך החנות, תקבל התראה לטלפון"
            color={PRO_PURPLE}
            isDark={isDark}
          />
        </Box>

        {/* סיכום */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {tile(counts.all, 'פעילים', PRO_PURPLE)}
          {tile(counts.store, 'מהחנות')}
          {tile(counts.trial, 'בניסיון')}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {tile(counts.granted + counts.permanent, 'ידני וקבוע')}
          {tile(counts.ending, 'מסתיימים השבוע', counts.ending > 0 ? '#D97706' : undefined)}
          {tile(counts.renewOff, 'חידוש בוטל', counts.renewOff > 0 ? '#DC2626' : undefined)}
        </Box>

        {/* בקשות תשלום ידניות ישנות שכבר דווחו כשולמו: לא להשאיר אף אחד בלי מנוי */}
        {legacy.length > 0 && (
          <Box sx={{
            p: 1.5, borderRadius: '16px', border: '1.5px solid', borderColor: PRO_PURPLE,
            bgcolor: isDark ? 'rgba(124,58,237,0.10)' : PRO_SOFT,
          }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: PRO_PURPLE, mb: 0.25 }}>
              תשלומים ישנים שממתינים לאישור ({legacy.length})
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1 }}>
              דווחו לפני שהתשלום עבר לחנויות. אחרי הטיפול בהם הכרטיס הזה ייעלם.
            </Typography>
            {legacy.map((r) => (
              <Box key={r.id} sx={{ p: 1.25, mb: 1, borderRadius: '12px', bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'baseline' }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{r.user?.name ?? '?'}</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: 15, color: PRO_PURPLE }}>₪{r.amount}</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {r.months} חודשים · {METHOD_LABEL[r.method] ?? r.method} · קוד <b dir="ltr">{r.reference}</b>
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button size="small" variant="contained" disabled={busyId === r.id} onClick={() => actLegacy(r.id, 'approve')}
                    sx={{ flex: 1, borderRadius: '999px', fontWeight: 800, background: PRO_PURPLE, boxShadow: 'none', '&:hover': { background: PRO_PURPLE_DARK, boxShadow: 'none' } }}>
                    {busyId === r.id ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'אשר והפעל'}
                  </Button>
                  <Button size="small" variant="outlined" color="error" disabled={busyId === r.id} onClick={() => actLegacy(r.id, 'reject')}
                    sx={{ borderRadius: '999px', fontWeight: 700 }}>
                    דחה
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* סינון */}
        <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, mx: -2, px: 2 }}>
          {chip('all', 'הכל', counts.all)}
          {chip('store', KIND_LABEL.store, counts.store)}
          {chip('trial', KIND_LABEL.trial, counts.trial)}
          {chip('granted', KIND_LABEL.granted, counts.granted)}
          {chip('permanent', KIND_LABEL.permanent, counts.permanent)}
          {chip('ending', 'מסתיימים', counts.ending)}
        </Box>

        {/* רשימת המנויים */}
        {usersError && !users ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 3 }}>
            לא הצלחנו לטעון את המנויים.
          </Typography>
        ) : !users ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={22} sx={{ color: PRO_PURPLE }} /></Box>
        ) : shown.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 3 }}>
            אין מנויים בקטגוריה הזו.
          </Typography>
        ) : (
          <Box sx={{
            borderRadius: '16px', overflow: 'hidden',
            border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)',
            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
          }}>
            {shown.map((s, i) => {
              const ending = s.daysLeft !== null && s.daysLeft <= ENDING_DAYS && !(s.kind === 'store' && s.user.planAutoRenew);
              return (
                <Box key={s.user.id} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 1.1,
                  borderTop: i === 0 ? 'none' : '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
                }}>
                  <Box sx={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: s.user.avatarColor || PRO_PURPLE, color: '#fff', fontSize: s.user.avatarEmoji ? 17 : 14, fontWeight: 800,
                  }}>
                    {s.user.avatarEmoji || s.user.name.charAt(0).toUpperCase()}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.user.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: ending ? '#D97706' : 'text.secondary', fontWeight: ending ? 700 : 400 }}>
                      {KIND_LABEL[s.kind]} · {statusLine(s)}
                    </Typography>
                  </Box>
                  <ProPill kind={s.kind} isDark={isDark} />
                </Box>
              );
            })}
          </Box>
        )}

        <LegacyTrialGrantCard isDark={isDark} onChanged={() => { onChanged(); void loadAdminUsers(true); }} />
      </Box>
    </Box>
  );
};
