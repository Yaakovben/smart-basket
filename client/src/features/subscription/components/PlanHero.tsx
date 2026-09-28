import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import type { SubscriptionStatus } from '../../../services/api/subscription.api';
import type { SubscriptionStrings } from '../subscription.strings';
import { PRO_SOFT, PRO_LILAC, PRO_PURPLE } from '../subscription.styles';

interface Props {
  status: SubscriptionStatus;
  s: SubscriptionStrings;
  isDark: boolean;
  locale: string;
}

const DAY_MS = 86_400_000;

// תגית סגלגלה אחידה לכל המידע הקטן בכרטיס (ימים שנותרו, מקור המנוי)
const pillSx = {
  px: 1.25, py: 0.4, borderRadius: '999px', border: '1px solid',
  fontSize: 12, fontWeight: 700, lineHeight: 1.4, color: '#fff',
} as const;

// ספירה מעלה חלקה עד הערך האמיתי (ללא אנימציה למי שביקש פחות תנועה).
const useCountUp = (target: number | null, ms = 900): number | null => {
  const [value, setValue] = useState<number | null>(target === null ? null : 0);
  useEffect(() => {
    if (target === null) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setValue(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return target === null ? null : value;
};

// כרטיס המצב בראש העמוד: Pro פעיל (עם ספירה לאחור אמיתית מהשרת / קבוע) או
// הצעת Pro למשתמש חינמי. גובה קבוע יחסית כדי שהעמוד לא "יקפוץ" בין מצבים.
export const PlanHero = ({ status, s, isDark, locale }: Props) => {
  const isPro = status.plan === 'pro';
  const isTrial = status.isTrial;
  const trialEnded = status.trialEnded;
  const expires = status.planExpiresAt ? new Date(status.planExpiresAt) : null;
  const daysLeft = expires ? Math.max(0, Math.ceil((expires.getTime() - Date.now()) / DAY_MS)) : null;
  // מנוי חנות שמתחדש אוטומטית לא "נגמר": מציגים את תאריך החידוש ולא ספירה לאחור
  const autoRenews = isPro && status.store.isStorePlan && status.store.autoRenew;
  const expiringSoon = !autoRenews && daysLeft !== null && daysLeft <= 7;
  // בניסיון התגית "מתנה" למעלה כבר אומרת את זה
  const sourceLabel = !isPro || isTrial ? null
    : status.planSource === 'store' ? s.sourceStore
    : s.sourceGranted;
  const shownDays = useCountUp(daysLeft);
  const expiryLabel = expires
    ? expires.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <Box sx={{
      position: 'relative', overflow: 'hidden', borderRadius: '22px',
      minHeight: 148, p: 2.5,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.75,
      background: isDark
        ? 'linear-gradient(135deg, #4C1D95, #5B21B6)'
        : 'linear-gradient(135deg, #5B21B6, #7C3AED)',
      boxShadow: '0 10px 26px rgba(91,33,182,0.28)',
      color: '#fff',
    }}>
      <Box aria-hidden sx={{ position: 'absolute', top: -40, insetInlineEnd: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
      <Box aria-hidden sx={{ position: 'absolute', bottom: -34, insetInlineStart: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, position: 'relative' }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '14px', flexShrink: 0,
          background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isPro
            ? <StarRoundedIcon sx={{ fontSize: 26, color: '#fff' }} />
            : <AutoAwesomeRoundedIcon sx={{ fontSize: 24, color: PRO_LILAC }} />}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{
            display: 'inline-block', px: 1, py: '1px', borderRadius: '999px', mb: 0.4,
            bgcolor: isPro ? '#fff' : 'rgba(255,255,255,0.18)',
            color: isPro ? PRO_PURPLE : '#fff',
            fontSize: 11, fontWeight: 800, letterSpacing: 0.4,
          }}>
            {isTrial ? `🎁 ${s.trialBadge}` : isPro ? `✦ ${s.proBadge}` : trialEnded ? s.trialEndedBadge : s.freeBadge}
          </Box>
          <Typography sx={{ fontSize: 19, fontWeight: 800, lineHeight: 1.2 }}>
            {isTrial ? s.trialTitle : isPro ? s.heroProTitle : trialEnded ? s.trialEndedTitle : s.heroFreeTitle}
          </Typography>
        </Box>
      </Box>

      <Typography sx={{ position: 'relative', fontSize: 13.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>
        {!isPro && (trialEnded ? s.trialEndedSub : s.heroFreeSub)}
        {isPro && !expires && s.heroPermanentSub}
        {isPro && expires && `${autoRenews ? s.heroRenewsOn : isTrial ? s.trialSub : s.heroActiveUntil} ${expiryLabel}`}
      </Typography>

      {(sourceLabel || (isPro && daysLeft !== null && !autoRenews)) && (
        <Box sx={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
          {isPro && daysLeft !== null && !autoRenews && (
            <Box sx={{ ...pillSx, bgcolor: expiringSoon ? 'rgba(251,191,36,0.22)' : 'rgba(255,255,255,0.16)', borderColor: expiringSoon ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.22)' }}>
              {daysLeft === 0 ? s.expiresToday : daysLeft === 1 ? s.dayLeft : `${shownDays ?? daysLeft} ${s.daysLeft}`}
            </Box>
          )}
          {sourceLabel && (
            <Box sx={{ ...pillSx, bgcolor: 'transparent', borderColor: 'rgba(255,255,255,0.28)', color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>
              {sourceLabel}
            </Box>
          )}
        </Box>
      )}
      {isPro && expiringSoon && (
        <Typography sx={{ position: 'relative', fontSize: 12, color: PRO_SOFT, fontWeight: 700 }}>
          {s.expiringSoon}
        </Typography>
      )}
    </Box>
  );
};
