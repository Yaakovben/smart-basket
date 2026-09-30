import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import { useSettings } from '../../../global/context/SettingsContext';
import type { User } from '../../../global/types';
import { getSubscriptionStrings } from '../subscription.strings';
import { proSoftPillSx } from '../subscription.styles';
import { peekSubscriptionStatus, loadSubscriptionStatus, subscribeSubscriptionStatus } from '../subscriptionStatusStore';

const DAY_MS = 86_400_000;

interface PlanSnapshot {
  plan: 'free' | 'pro';
  planExpiresAt: string | null;
  isTrial: boolean;
  trialEnded: boolean;
}

// מצב מיידי מפרטי המשתמש שכבר בזיכרון: Pro שתוקפו עבר נחשב חינמי
const fromUser = (user: User): PlanSnapshot => {
  const expires = user.planExpiresAt ?? null;
  const active = user.plan === 'pro' && (!expires || new Date(expires).getTime() > Date.now());
  return {
    plan: active ? 'pro' : 'free',
    planExpiresAt: expires,
    isTrial: active && user.planSource === 'trial',
    trialEnded: !active && user.planSource === 'trial',
  };
};

// תג קטן בשורת "ניהול מנוי" בהגדרות: מצב המנוי במבט (Pro / ניסיון + ימים).
// מוצג מיד, בלי לחכות לשרת: קודם מהמצב השמור, ואם אין אז מפרטי המשתמש.
// הנתון מהשרת מתעדכן ברקע ומחליף אותו רק אם השתנה משהו.
export const SubscriptionRowBadge = ({ user }: { user: User }) => {
  const { settings } = useSettings();
  const s = getSubscriptionStrings(settings.language);
  const [snap, setSnap] = useState<PlanSnapshot>(() => peekSubscriptionStatus() ?? fromUser(user));

  useEffect(() => {
    const unsubscribe = subscribeSubscriptionStatus(setSnap);
    loadSubscriptionStatus().then(setSnap).catch(() => { /* נשארים עם המצב המיידי */ });
    return unsubscribe;
  }, []);

  if (snap.plan !== 'pro' && !snap.trialEnded) return null;

  const isPro = snap.plan === 'pro';
  const days = snap.planExpiresAt
    ? Math.max(0, Math.ceil((new Date(snap.planExpiresAt).getTime() - Date.now()) / DAY_MS))
    : null;
  const Mark = snap.isTrial ? CardGiftcardRoundedIcon : WorkspacePremiumRoundedIcon;
  const label = isPro
    ? `Pro${days !== null ? ` · ${days} ${s.daysLeft}` : ''}`
    : s.trialEndedBadge;

  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.4,
      px: 1, py: '2px', borderRadius: '999px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
      ...(isPro
        ? proSoftPillSx(settings.theme === 'dark')
        : { bgcolor: 'action.selected', color: 'text.secondary', border: '1px solid transparent' }),
    }}>
      {isPro && <Mark sx={{ fontSize: 13 }} />}
      {label}
    </Box>
  );
};
