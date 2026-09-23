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
  // נבדל מ-status===null: מונע "קפיצה" של השורה כשהתג מופיע פתאום אחרי
  // שהסטטוס נטען - עד אז תופס בדיוק את המקום של התג בעזרת שלד דועך, כדי
  // שרוחב השורה (והשברון שאחריה) לא ישתנה ברגע שהתג נכנס.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    subscriptionApi.getStatus()
      .then((st) => { if (!cancelled) setStatus(st); })
      .catch(() => { /* ללא תג */ })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  if (!loaded) {
    return (
      <Box aria-hidden="true" sx={{
        width: 54, height: 20, borderRadius: '999px',
        bgcolor: 'action.hover',
        animation: 'sbRowBadgePulse 1.3s ease-in-out infinite',
        '@keyframes sbRowBadgePulse': { '0%, 100%': { opacity: 0.45 }, '50%': { opacity: 0.85 } },
      }} />
    );
  }
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
      animation: 'sbRowBadgeIn 0.2s ease both',
      '@keyframes sbRowBadgeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
    }}>
      {label}
    </Box>
  );
};
