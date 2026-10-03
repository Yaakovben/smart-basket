import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { useSettings } from '../../../global/context/SettingsContext';
import type { User } from '../../../global/types';
import { getSubscriptionStrings } from '../subscription.strings';
import { PRO_GRADIENT, PRO_GOLD_GRADIENT } from '../subscription.styles';
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
  const Mark = snap.isTrial ? CardGiftcardRoundedIcon : StarRoundedIcon;

  // הניסיון הסתיים: תגית שקטה, בלי צבע של Pro
  if (!isPro) {
    return (
      <Box component="span" sx={{
        display: 'inline-flex', alignItems: 'center', px: 1, py: '2px', borderRadius: '999px',
        fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', bgcolor: 'action.selected', color: 'text.secondary',
      }}>
        {s.trialEndedBadge}
      </Box>
    );
  }

  // Pro פעיל: תגית סגולה עם כוכב זהוב (או מתנה בניסיון), מספר הימים בולט,
  // וברק שעובר עליה מדי פעם כדי שתרגיש חיה בלי להטריד
  return (
    <Box component="span" sx={{
      position: 'relative', overflow: 'hidden',
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      paddingInlineStart: 0.4, paddingInlineEnd: 1, py: '3px', borderRadius: '999px', whiteSpace: 'nowrap',
      background: PRO_GRADIENT, color: '#fff',
      boxShadow: '0 3px 10px rgba(91,33,182,0.28)',
      '&::after': {
        content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)',
        transform: 'translateX(-130%)',
        animation: 'sbBadgeSheen 4.5s ease-in-out 1s infinite',
      },
      '@keyframes sbBadgeSheen': {
        '0%': { transform: 'translateX(-130%)' },
        '35%, 100%': { transform: 'translateX(130%)' },
      },
      '@media (prefers-reduced-motion: reduce)': { '&::after': { animation: 'none', display: 'none' } },
    }}>
      <Box component="span" sx={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: PRO_GOLD_GRADIENT, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
      }}>
        <Mark sx={{ fontSize: 12, color: '#4C1D95' }} />
      </Box>
      {days !== null ? (
        <>
          <Box component="span" sx={{ fontSize: 13, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{days}</Box>
          <Box component="span" sx={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1, opacity: 0.88 }}>{s.daysLeft}</Box>
        </>
      ) : (
        <Box component="span" sx={{ fontSize: 11.5, fontWeight: 900, letterSpacing: 0.3 }}>Pro</Box>
      )}
    </Box>
  );
};
