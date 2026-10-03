import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import type { SubscriptionStatus } from '../../../services/api/subscription.api';
import type { SubscriptionStrings } from '../subscription.strings';
import { PRO_LILAC, PRO_PURPLE } from '../subscription.styles';

interface Props {
  status: SubscriptionStatus;
  s: SubscriptionStrings;
  isDark: boolean;
  locale: string;
}

const DAY_MS = 86_400_000;

// מיקום הניצוצות בכרטיס (באחוזים), כל אחד בקצב משלו
const SPARKLES = [
  { top: '14%', start: '52%', size: 14, delay: 0 },
  { top: '70%', start: '44%', size: 11, delay: 1.1 },
  { top: '30%', start: '88%', size: 12, delay: 2.2 },
];

// תגית סגלגלה אחידה לכל המידע הקטן בכרטיס (מקור המנוי)
const pillSx = {
  px: 1.25, py: 0.4, borderRadius: '999px', border: '1px solid',
  fontSize: 12, fontWeight: 700, lineHeight: 1.4, color: '#fff',
} as const;

// ספירה לאחור: המספר מתחיל מאורך התקופה המלאה ויורד עד הימים שנשארו, והטבעת
// מתרוקנת יחד איתו. בלי אנימציה למי שביקש פחות תנועה.
const useCountDown = (target: number | null, from: number, ms = 1400): number | null => {
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const start = Math.max(from, target ?? 0);
  const [value, setValue] = useState<number | null>(target === null ? null : reduce ? target : start);
  useEffect(() => {
    if (target === null || reduce) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(start - (start - target) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, ms, reduce]);
  return target === null ? null : value;
};

// טבעת ספירה לאחור: המספר הגדול במרכז, והקשת הזהובה מתקצרת ככל שהימים יורדים.
// היחס הוא מתוך תקופת המתנה המלאה (בניסיון) או מתוך חודש (בכל מנוי אחר).
const RING_SIZE = 84;
const RING_STROKE = 6;
const CountdownRing = ({ shown, total, caption }: { shown: number; total: number; caption: string }) => {
  const r = (RING_SIZE - RING_STROKE) / 2;
  const c = 2 * Math.PI * r;
  // לפי המספר שמוצג כרגע, כך שהטבעת מתרוקנת יחד עם הספירה לאחור
  const ratio = total > 0 ? Math.min(1, Math.max(0, shown / total)) : 0;
  const mid = RING_SIZE / 2;
  return (
    <Box sx={{ position: 'relative', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ position: 'relative', width: RING_SIZE, height: RING_SIZE }}>
        <Box component="svg" viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} sx={{ width: RING_SIZE, height: RING_SIZE, transform: 'rotate(-90deg)' }} aria-hidden>
          <defs>
            <linearGradient id="sbRingGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
          <circle cx={mid} cy={mid} r={r} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth={RING_STROKE} />
          <Box
            component="circle"
            cx={mid} cy={mid} r={r} fill="none" stroke="url(#sbRingGold)" strokeWidth={RING_STROKE} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - ratio)}
            sx={{
              // זוהר זהוב שפועם לאט: הטבעת מרגישה חיה
              animation: 'sbRingGlow 2.8s ease-in-out infinite',
              '@keyframes sbRingGlow': {
                '0%, 100%': { filter: 'drop-shadow(0 0 2px rgba(253,230,138,0.35))' },
                '50%': { filter: 'drop-shadow(0 0 7px rgba(253,230,138,0.75))' },
              },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          />
        </Box>
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{
            fontSize: shown >= 100 ? 24 : 30, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            background: 'linear-gradient(180deg, #FFFFFF, #FDE68A)', WebkitBackgroundClip: 'text', backgroundClip: 'text',
            color: 'transparent',
          }}>
            {shown}
          </Typography>
        </Box>
      </Box>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.82)', whiteSpace: 'nowrap' }}>{caption}</Typography>
    </Box>
  );
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
  const ringTotalForCount = isTrial && status.trialMonths > 0 ? status.trialMonths * 30 : Math.max(30, daysLeft ?? 0);
  const shownDays = useCountDown(daysLeft, ringTotalForCount);
  const expiryLabel = expires
    ? expires.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const showRing = isPro && daysLeft !== null && !autoRenews;
  const ringCaption = daysLeft === 0 ? s.expiresToday : daysLeft === 1 ? s.dayLeft : s.daysLeft;

  return (
    <Box sx={{
      position: 'relative', overflow: 'hidden', borderRadius: '24px',
      minHeight: 156, p: 2.5,
      display: 'flex', alignItems: 'center', gap: 2,
      background: isDark
        ? 'radial-gradient(120% 90% at 100% 0%, rgba(129,140,248,0.30) 0%, transparent 55%), linear-gradient(145deg, #2E1065 0%, #4C1D95 50%, #312E81 100%)'
        : 'radial-gradient(120% 90% at 100% 0%, rgba(165,180,252,0.35) 0%, transparent 55%), linear-gradient(145deg, #5B21B6 0%, #6D28D9 45%, #4338CA 100%)',
      boxShadow: '0 12px 30px rgba(67,56,202,0.28), inset 0 1px 0 rgba(255,255,255,0.16)',
      border: '1px solid rgba(255,255,255,0.14)',
      color: '#fff',
    }}>
      {/* ברק אלכסוני שעובר על הכרטיס מדי כמה שניות */}
      <Box aria-hidden sx={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: 90,
        background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.14), transparent)',
        pointerEvents: 'none',
        transform: 'translateX(-150%) skewX(-18deg)',
        animation: 'sbHeroSheen 6s ease-in-out 0.8s infinite',
        '@keyframes sbHeroSheen': {
          '0%': { transform: 'translateX(-150%) skewX(-18deg)' },
          '30%, 100%': { transform: 'translateX(600%) skewX(-18deg)' },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none', display: 'none' },
      }} />
      {/* ניצוצות זהובים שמנצנצים, רק כש-Pro פעיל */}
      {isPro && SPARKLES.map((sp, i) => (
        <AutoAwesomeRoundedIcon key={i} aria-hidden sx={{
          position: 'absolute', top: sp.top, insetInlineStart: sp.start, fontSize: sp.size,
          color: '#FDE68A', opacity: 0, pointerEvents: 'none',
          animation: `sbTwinkle 3.2s ease-in-out ${sp.delay}s infinite`,
          '@keyframes sbTwinkle': {
            '0%, 100%': { opacity: 0, transform: 'scale(0.6) rotate(0deg)' },
            '50%': { opacity: 0.85, transform: 'scale(1) rotate(20deg)' },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.5 },
        }} />
      ))}
      <Box aria-hidden sx={{ position: 'absolute', top: -46, insetInlineEnd: -36, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />

      <Box sx={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '14px', flexShrink: 0,
            background: isPro ? 'linear-gradient(135deg, #FDE68A, #F59E0B)' : 'rgba(255,255,255,0.16)',
            border: isPro ? 'none' : '1px solid rgba(255,255,255,0.22)',
            boxShadow: isPro ? '0 6px 16px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.6)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isPro
              ? <StarRoundedIcon sx={{ fontSize: 26, color: '#4C1D95' }} />
              : <AutoAwesomeRoundedIcon sx={{ fontSize: 24, color: PRO_LILAC }} />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 1, py: '1px', borderRadius: '999px', mb: 0.4,
              bgcolor: isPro ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.18)',
              color: isPro ? PRO_PURPLE : '#fff',
              fontSize: 11, fontWeight: 800, letterSpacing: 0.4,
            }}>
              {isTrial && <CardGiftcardRoundedIcon sx={{ fontSize: 13 }} />}
              {isTrial ? s.trialBadge : isPro ? s.proBadge : trialEnded ? s.trialEndedBadge : s.freeBadge}
            </Box>
            <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1.2, letterSpacing: -0.2 }}>
              {isTrial ? s.trialTitle : isPro ? s.heroProTitle : trialEnded ? s.trialEndedTitle : s.heroFreeTitle}
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
          {!isPro && (trialEnded ? s.trialEndedSub : s.heroFreeSub)}
          {isPro && !expires && s.heroPermanentSub}
          {isPro && expires && `${autoRenews ? s.heroRenewsOn : isTrial ? s.trialSub : s.heroActiveUntil} ${expiryLabel}`}
        </Typography>

        {sourceLabel && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.25 }}>
            <Box sx={{ ...pillSx, bgcolor: 'transparent', borderColor: 'rgba(255,255,255,0.28)', color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>
              {sourceLabel}
            </Box>
          </Box>
        )}
        {isPro && expiringSoon && (
          <Typography sx={{ fontSize: 12, color: '#FDE68A', fontWeight: 800 }}>
            {s.expiringSoon}
          </Typography>
        )}
      </Box>

      {showRing && daysLeft !== null && (
        <CountdownRing shown={shownDays ?? daysLeft} total={ringTotalForCount} caption={ringCaption} />
      )}
    </Box>
  );
};
