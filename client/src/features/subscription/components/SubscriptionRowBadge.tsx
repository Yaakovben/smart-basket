import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useSettings } from '../../../global/context/SettingsContext';
import { subscriptionApi, type SubscriptionStatus } from '../../../services/api/subscription.api';
import { getSubscriptionStrings } from '../subscription.strings';
import { PRO_SOFT, PRO_PURPLE } from '../subscription.styles';

const DAY_MS = 86_400_000;

// תג קטן בשורת "ניהול מנוי" בהגדרות: מצב המנוי במבט (Pro / ניסיון + ימים).
// best-effort - כשל בטעינה פשוט לא מציג תג.
export const SubscriptionRowBadge = () => {
  const { settings } = useSettings();
  const s = getSubscriptionStrings(settings.language);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    subscriptionApi.getStatus().then((st) => { if (!cancelled) setStatus(st); }).catch(() => { /* ללא תג */ });
    return () => { cancelled = true; };
  }, []);

  if (!status) return null;
  if (status.plan !== 'pro' && !status.trialEnded) return null;

  const days = status.planExpiresAt
    ? Math.max(0, Math.ceil((new Date(status.planExpiresAt).getTime() - Date.now()) / DAY_MS))
    : null;
  const label = status.plan === 'pro'
    ? `${status.isTrial ? '🎁' : '✦'} Pro${days !== null ? ` · ${days} ${s.daysLeft}` : ''}`
    : s.trialEndedBadge;
  const isPro = status.plan === 'pro';

  return (
    <Box component="span" sx={{
      px: 1, py: '2px', borderRadius: '999px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
      bgcolor: isPro ? PRO_SOFT : 'action.selected',
      color: isPro ? PRO_PURPLE : 'text.secondary',
    }}>
      {label}
    </Box>
  );
};
