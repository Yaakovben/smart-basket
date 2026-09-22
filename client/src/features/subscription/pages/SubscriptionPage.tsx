import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Button, CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useSettings } from '../../../global/context/SettingsContext';
import { COMMON_STYLES } from '../../../global/constants';
import type { ToastType } from '../../../global/types';
import type { SubscriptionPayMethod } from '../../../services/api/subscription.api';
import { getSubscriptionStrings } from '../subscription.strings';
import { useSubscription } from '../hooks/useSubscription';
import { PlanHero } from '../components/PlanHero';
import { UsageCard } from '../components/UsageAndCompare';
import { PeriodPicker, priceFor } from '../components/PeriodPicker';
import { PaymentPanel } from '../components/PaymentPanel';
import { ReportedCard, ApprovedCard, RejectedNotice, HistoryCard, PaymentUnavailableCard } from '../components/RequestCards';
import { SubscriptionSkeleton } from '../components/SubscriptionSkeleton';
import { StepIndicator } from '../components/StepIndicator';
import { WelcomeProDialog } from '../components/WelcomeProDialog';
import { PerksGrid, TrustRow } from '../components/PerksAndTrust';
import { PlanComparisonTable } from '../components/PlanComparisonTable';
import { primaryCtaSx, revealSx } from '../subscription.styles';

interface Props {
  showToast: (msg: string, type?: ToastType) => void;
}

const Reveal = ({ i, children }: { i: number; children: ReactNode }) => <Box sx={revealSx(i)}>{children}</Box>;

const LOCALES = { he: 'he-IL', en: 'en-GB', ru: 'ru-RU' } as const;

export const SubscriptionPage = ({ showToast }: Props) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const s = getSubscriptionStrings(settings.language);
  const locale = LOCALES[settings.language] ?? 'he-IL';

  const { status, loading, error, busy, reload, createRequest, reportPaid, cancelRequest } = useSubscription();
  const [monthsChoice, setMonthsChoice] = useState<number | null>(null);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [activated, setActivated] = useState(false);
  const wasReportedRef = useRef(false);
  const activatedExpiry = status?.planExpiresAt
    ? new Date(status.planExpiresAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : undefined;

  const months = useMemo(() => {
    if (!status) return 1;
    const allowed = status.catalog.allowedMonths;
    if (monthsChoice && allowed.includes(monthsChoice)) return monthsChoice;
    return allowed.includes(12) ? 12 : allowed[0] ?? 1;
  }, [status, monthsChoice]);

  const isPro = status?.plan === 'pro';
  const isPermanent = isPro && !status?.planExpiresAt;
  const hasPaymentMethod = !!(status?.payment.bit || status?.payment.paybox || status?.payment.bank);
  const defaultMethod: SubscriptionPayMethod = status?.payment.bit ? 'bit' : status?.payment.paybox ? 'paybox' : 'bank';
  const open = status?.openRequest ?? null;
  const lastResolved = status?.history.find((h) => h.status !== 'pending' && h.status !== 'reported' && h.status !== 'cancelled');
  const showRejected = !open && lastResolved?.status === 'rejected';

  const reportedNow = open?.status === 'reported';

  // בזמן שהתשלום בבדיקה - בודקים שקט כל 20 שניות אם הופעל, וגם כשחוזרים לאפליקציה.
  useEffect(() => {
    if (!reportedNow) return;
    const poll = () => { if (document.visibilityState === 'visible') void reload(true); };
    const id = window.setInterval(poll, 20_000);
    document.addEventListener('visibilitychange', poll);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', poll); };
  }, [reportedNow, reload]);

  // הבקשה עברה מ"בבדיקה" ל"אושרה" בזמן שהמשתמש כאן - חוגגים.
  useEffect(() => {
    if (!status) return;
    if (wasReportedRef.current && !status.openRequest && status.plan === 'pro' && status.history[0]?.status === 'approved') {
      setActivated(true);
    }
    wasReportedRef.current = status.openRequest?.status === 'reported';
  }, [status]);

  const errorMessage = (code?: string) => (code === 'REQUEST_ALREADY_REPORTED' ? s.errorAlreadyReported : s.errorGeneric);

  const handleContinue = async () => {
    if (!hasPaymentMethod) { setShowUnavailable(true); return; }
    const res = await createRequest(months, defaultMethod);
    if (!res.ok) showToast(errorMessage(res.code), 'error');
  };

  const handleChangeMethod = async (method: SubscriptionPayMethod) => {
    if (!open) return;
    const res = await createRequest(open.months, method);
    if (!res.ok) showToast(errorMessage(res.code), 'error');
  };

  const handlePaid = async () => {
    if (!open) return;
    const res = await reportPaid(open.id);
    if (res.ok) showToast(s.reportedToast, 'success');
    else showToast(errorMessage(res.code), 'error');
  };

  const handleCancel = async () => {
    if (!open) return;
    const res = await cancelRequest(open.id);
    if (res.ok) showToast(s.cancelledToast, 'info');
    else showToast(errorMessage(res.code), 'error');
  };

  const showCheckout = !!status && !open && !isPermanent && !activated;

  return (
    <Box sx={{
      height: { xs: 'var(--app-height, 100dvh)', sm: '100vh' }, display: 'flex', flexDirection: 'column',
      bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', overflow: 'hidden',
    }}>
      <Box sx={{
        background: isDark ? COMMON_STYLES.gradients.header.dark : COMMON_STYLES.gradients.header.light,
        p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 24px', sm: '48px 20px 24px' },
        flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate(-1)} sx={COMMON_STYLES.glassIconButton} aria-label="back">
            <ArrowForwardIcon sx={{ fontSize: 22 }} />
          </IconButton>
          <Typography sx={{ flex: 1, color: 'white', fontSize: 20, fontWeight: 700 }}>{s.pageTitle}</Typography>
        </Box>
      </Box>

      <Box sx={{
        flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        p: { xs: 2, sm: 2.5 }, pb: 'calc(28px + env(safe-area-inset-bottom))',
      }}>
        {loading && !status ? (
          <SubscriptionSkeleton />
        ) : error && !status ? (
          <Box sx={{ textAlign: 'center', py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ color: 'text.secondary' }}>{s.loadError}</Typography>
            <Button variant="outlined" onClick={() => void reload()} sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, color: '#7C3AED', borderColor: '#7C3AED', '&:hover': { borderColor: '#6D28D9', bgcolor: 'rgba(124,58,237,0.06)' } }}>{s.retry}</Button>
          </Box>
        ) : status ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Reveal i={0}><PlanHero status={status} s={s} isDark={isDark} locale={locale} /></Reveal>

            {/* מה כלול בכל תוכנית - תמיד מוצג (גם למי שכבר Pro), כדי שברור בכל
                רגע מה ההבדל, לא רק ברגע השדרוג. */}
            <Reveal i={1}><PlanComparisonTable status={status} s={s} isDark={isDark} /></Reveal>

            {/* מחוון השלבים מוצג רק אחרי שנבחרה תקופה ונפתחה בקשת תשלום - בתחילת
                הדרך (בחירת תקופה) הוא רק מבלבל בלי שום פעולה שהוא מתאר.
                step=4 (activated) = שלב סופי אמיתי, לא רק "3 - עדיין מאשרים". */}
            {(open || activated) && (
              <Reveal i={1}><StepIndicator step={activated ? 4 : open?.status === 'pending' ? 2 : 3} s={s} isDark={isDark} /></Reveal>
            )}

            {/* אושר בזמן שהמשתמש עדיין כאן - מסך מנוחה "זהו, נגמר", לא רק
                חלון קופץ שנעלם. נשאר עד שלוחצים "מתחילים" (אותו onClose
                כמו בחלון). */}
            {activated ? (
              <Reveal i={2}><ApprovedCard expiryDate={activatedExpiry} s={s} isDark={isDark} onDismiss={() => setActivated(false)} /></Reveal>
            ) : open?.status === 'pending' ? (
              <Reveal i={2}>
                <PaymentPanel
                  status={status} request={open} s={s} isDark={isDark} busy={busy}
                  onChangeMethod={handleChangeMethod} onPaid={handlePaid} onCancel={handleCancel}
                />
              </Reveal>
            ) : open?.status === 'reported' ? (
              <Reveal i={2}><ReportedCard request={open} s={s} isDark={isDark} locale={locale} /></Reveal>
            ) : null}

            {showRejected && lastResolved && <Reveal i={1}><RejectedNotice request={lastResolved} s={s} isDark={isDark} /></Reveal>}

            {showCheckout && !showUnavailable && (
              <>
                {!isPro && <Reveal i={2}><UsageCard status={status} s={s} isDark={isDark} /></Reveal>}
                {!isPro && <Reveal i={3}><PerksGrid s={s} isDark={isDark} /></Reveal>}
                <Reveal i={isPro ? 2 : 4}><PeriodPicker status={status} s={s} isDark={isDark} months={months} onChange={setMonthsChoice} /></Reveal>
                <Reveal i={isPro ? 3 : 5}>
                  <Button variant="contained" fullWidth disabled={busy} onClick={handleContinue} sx={primaryCtaSx}>
                    {busy
                      ? <CircularProgress size={22} sx={{ color: '#fff' }} />
                      : `${status.isTrial ? s.trialKeepCta : isPro ? s.renewCta : s.upgradeCta} · ₪${priceFor(status, months)}`}
                  </Button>
                </Reveal>
                {isPro && (
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center' }}>{status.isTrial ? s.trialKeepNote : s.renewNote}</Typography>
                )}
                <Reveal i={isPro ? 4 : 6}><TrustRow s={s} isDark={isDark} /></Reveal>
              </>
            )}

            {showCheckout && showUnavailable && (
              <Reveal i={2}><PaymentUnavailableCard s={s} isDark={isDark} email={status.payment.supportEmail} onBack={() => setShowUnavailable(false)} /></Reveal>
            )}

            <HistoryCard history={status.history} s={s} isDark={isDark} locale={locale} />
          </Box>
        ) : null}
      </Box>
      <WelcomeProDialog
        open={activated ? 'paid' : null}
        expiryDate={activatedExpiry}
        onClose={() => setActivated(false)}
        onDetails={() => setActivated(false)}
      />
    </Box>
  );
};
