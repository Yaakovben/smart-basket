import { useEffect, useState } from 'react';
import { Box, Typography, Button, ButtonBase, CircularProgress, Dialog } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import { useSettings } from '../../../global/context/SettingsContext';
import { haptic } from '../../../global/helpers';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { QRCodeSVG } from 'qrcode.react';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import type { SubscriptionStatus, SubscriptionRequestDto, SubscriptionPayMethod } from '../../../services/api/subscription.api';
import type { SubscriptionStrings } from '../subscription.strings';
import { cardSx, primaryCtaSx, ghostCtaSx, PRO_PURPLE } from '../subscription.styles';

interface Props {
  status: SubscriptionStatus;
  request: SubscriptionRequestDto;
  s: SubscriptionStrings;
  isDark: boolean;
  busy: boolean;
  onChangeMethod: (method: SubscriptionPayMethod) => void;
  onPaid: () => void;
  onCancel: () => void;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

const useCopy = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      haptic('light');
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1600);
    } catch { /* אין הרשאת לוח - אפשר להעתיק ידנית */ }
  };
  return { copiedKey, copy };
};

const CopyChip = ({ copied, label, copiedLabel, onClick, isDark }: { copied: boolean; label: string; copiedLabel: string; onClick: () => void; isDark: boolean }) => (
  <ButtonBase
    onClick={onClick}
    aria-label={label}
    sx={{
      flexShrink: 0, gap: 0.65, px: 1.1, py: 0.6, borderRadius: '10px',
      fontSize: 12, fontWeight: 700, color: copied ? '#5B21B6' : PRO_PURPLE,
      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
      border: '1px solid', borderColor: copied ? '#5B21B6' : 'divider',
      transition: 'color 0.15s, border-color 0.15s',
    }}
  >
    {copied ? <CheckRoundedIcon sx={{ fontSize: 15 }} /> : <ContentCopyRoundedIcon sx={{ fontSize: 14 }} />}
    {copied ? copiedLabel : label}
  </ButtonBase>
);

interface RowProps {
  id: string; label: string; value: string; emphasize?: boolean;
  s: SubscriptionStrings; isDark: boolean; copiedKey: string | null; onCopy: (key: string, value: string) => void;
}

const CopyRow = ({ id, label, value, emphasize, s, isDark, copiedKey, onCopy }: RowProps) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.1, borderRadius: '12px',
    bgcolor: emphasize ? (isDark ? 'rgba(124,58,237,0.16)' : 'rgba(124,58,237,0.07)') : 'action.hover',
    border: '1px solid', borderColor: emphasize ? 'rgba(124,58,237,0.35)' : 'transparent',
  }}>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
      <Typography dir="ltr" sx={{
        fontSize: emphasize ? 20 : 15, fontWeight: 800, letterSpacing: emphasize ? 1.5 : 0.3,
        textAlign: 'start', fontVariantNumeric: 'tabular-nums', wordBreak: 'break-all',
        color: emphasize ? PRO_PURPLE : 'text.primary',
      }}>
        {value}
      </Typography>
    </Box>
    <CopyChip copied={copiedKey === id} label={s.copy} copiedLabel={s.copied} onClick={() => onCopy(id, value)} isDark={isDark} />
  </Box>
);

const addMonths = (from: Date, months: number) => {
  const d = new Date(from.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
};

const FaqItem = ({ q, a, isDark }: { q: string; a: string; isDark: boolean }) => {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
      <ButtonBase
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        sx={{ width: '100%', justifyContent: 'space-between', textAlign: 'start', gap: 1, py: 1.25, px: 0.25 }}
      >
        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{q}</Typography>
        <ExpandMoreRoundedIcon sx={{ fontSize: 20, color: 'text.secondary', transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </ButtonBase>
      <Box sx={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
        <Box sx={{ overflow: 'hidden' }}>
          <Typography sx={{ fontSize: 12.5, color: isDark ? 'rgba(255,255,255,0.72)' : 'text.secondary', lineHeight: 1.6, pb: 1.25, px: 0.25 }}>{a}</Typography>
        </Box>
      </Box>
    </Box>
  );
};

const StepHeader = ({ n, title }: { n: number; title: string }) => (
  <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: PRO_PURPLE, mb: 1 }}>
    {n}. {title}
  </Typography>
);

// מסך התשלום: פרטים אמיתיים מהשרת בלבד (ביט/PayBox דרך קישור+QR, או העברה
// בנקאית), קוד הפניה להערה, ודיווח "שילמתי" שמעביר את הבקשה לאישור אדמין.
// לא מציגים מספר טלפון או שם מקבל. כשהמשתמש חוזר לאפליקציה אחרי שפתח את
// אפליקציית התשלום, מזכירים לו ללחוץ "שילמתי".
export const PaymentPanel = ({ status, request, s, isDark, busy, onChangeMethod, onPaid, onCancel }: Props) => {
  const { bit, paybox, bank } = status.payment;
  const { copiedKey, copy } = useCopy();
  const [leftForPayment, setLeftForPayment] = useState(false);
  const [backFromPayment, setBackFromPayment] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const { settings } = useSettings();
  const locale = settings.language === 'he' ? 'he-IL' : settings.language === 'ru' ? 'ru-RU' : 'en-GB';
  const currentExpiry = status.planExpiresAt ? new Date(status.planExpiresAt) : null;
  const startsFrom = status.plan === 'pro' && currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
  const validUntil = addMonths(startsFrom, request.months).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!leftForPayment) return;
    const onVisible = () => { if (document.visibilityState === 'visible') setBackFromPayment(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [leftForPayment]);

  const methods = ([bit && 'bit', paybox && 'paybox', bank && 'bank'].filter(Boolean)) as SubscriptionPayMethod[];
  const method = request.method;
  const methodLabel: Record<SubscriptionPayMethod, string> = { bit: s.payBit, paybox: s.payPaybox, bank: s.payBank };
  const url = method === 'bit' ? bit?.url : method === 'paybox' ? paybox?.url : null;
  const monthsLabel = request.months === 1 ? s.month1 : request.months === 3 ? s.month3 : s.month12;
  const rowProps = { s, isDark, copiedKey, onCopy: copy };
  const soft = isDark ? 'rgba(124,58,237,0.16)' : 'rgba(124,58,237,0.07)';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ ...cardSx(isDark), textAlign: 'center', py: 2.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>{s.payAmount}</Typography>
        <Typography sx={{ fontSize: 42, fontWeight: 900, lineHeight: 1.15, color: PRO_PURPLE, fontVariantNumeric: 'tabular-nums' }}>
          ₪{fmt(request.amount)}
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{s.payFor} {monthsLabel}</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 1.5 }}>{s.summaryValidUntil} {validUntil}</Typography>
        <CopyChip copied={copiedKey === 'amount'} label={s.copyAmount} copiedLabel={s.copied} onClick={() => copy('amount', fmt(request.amount))} isDark={isDark} />
      </Box>

      {methods.length > 1 && (
        <Box role="tablist" sx={{
          display: 'grid', gridTemplateColumns: `repeat(${methods.length}, 1fr)`, gap: 0.5, p: 0.5, borderRadius: '14px',
          bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
        }}>
          {methods.map((m) => (
            <ButtonBase
              key={m}
              role="tab"
              aria-selected={m === method}
              disabled={busy}
              onClick={() => m !== method && onChangeMethod(m)}
              sx={{
                py: 1, borderRadius: '11px', fontWeight: 800, fontSize: 13.5, transition: 'all 0.15s',
                bgcolor: m === method ? (isDark ? '#1E293B' : '#fff') : 'transparent',
                color: m === method ? PRO_PURPLE : 'text.secondary',
                boxShadow: m === method ? '0 1px 4px rgba(15,23,42,0.15)' : 'none',
              }}
            >
              {methodLabel[m]}
            </ButtonBase>
          ))}
        </Box>
      )}

      <Box sx={cardSx(isDark)}>
        <StepHeader n={1} title={method === 'bank' ? s.payStep1Bank : s.payStep1Link} />
        {url && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            {/* פתיחה ישירה באפליקציית התשלום - הדרך הראשית והכי נוחה. ה-QR
                נשאר זמין למי שצריך (למשל תשלום ממכשיר אחר) אבל לא תופס את
                תשומת הלב הראשונה - פחות "טכני", יותר "לחצו וזהו". */}
            <Button
              variant="contained"
              fullWidth
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setLeftForPayment(true)}
              startIcon={<OpenInNewRoundedIcon sx={{ fontSize: 18 }} />}
              sx={{ borderRadius: '14px', py: 1.35, textTransform: 'none', fontWeight: 800, fontSize: 15.5, gap: 1, background: PRO_PURPLE, boxShadow: 'none', '&:hover': { background: '#6D28D9', boxShadow: 'none' } }}
            >
              {method === 'bit' ? s.payOpenBit : s.payOpenPaybox}
            </Button>

            <ButtonBase
              onClick={() => setShowQr((v) => !v)}
              aria-expanded={showQr}
              sx={{
                gap: 0.75, px: 1.25, py: 0.6, borderRadius: '999px', mt: 0.25,
                fontSize: 12.5, fontWeight: 700, color: 'text.secondary',
              }}
            >
              <QrCode2RoundedIcon sx={{ fontSize: 16 }} />
              {s.payShowQr}
              <ExpandMoreRoundedIcon sx={{ fontSize: 17, transition: 'transform 0.25s', transform: showQr ? 'rotate(180deg)' : 'none' }} />
            </ButtonBase>

            <Box sx={{ display: 'grid', gridTemplateRows: showQr ? '1fr' : '0fr', width: '100%', transition: 'grid-template-rows 0.3s ease' }}>
              <Box sx={{ overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, pt: 1 }}>
                  <Box sx={{
                    p: 1.25, bgcolor: '#fff', borderRadius: '18px', lineHeight: 0,
                    border: '1.5px solid', borderColor: soft,
                  }}>
                    <QRCodeSVG value={url} size={148} level="M" />
                  </Box>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center' }}>{s.payScan}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
        {method === 'bank' && bank && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <CopyRow id="bankName" label={s.bankName} value={bank.bankName} {...rowProps} />
            <CopyRow id="bankBranch" label={s.bankBranch} value={bank.branch} {...rowProps} />
            <CopyRow id="bankAccount" label={s.bankAccount} value={bank.account} {...rowProps} />
          </Box>
        )}

        <Box sx={{ mt: 2 }} />
        <StepHeader n={2} title={s.payStep2} />
        <CopyRow id="reference" label={s.payReference} value={request.reference} emphasize {...rowProps} />
        <Typography sx={{ fontSize: 12, color: 'text.secondary', px: 0.5, mt: 0.75 }}>{s.payReferenceHint}</Typography>
      </Box>

      {backFromPayment && (
        <Box sx={{
          px: 1.75, py: 1.25, borderRadius: '14px', textAlign: 'center', bgcolor: soft,
          border: '1px solid rgba(124,58,237,0.35)', color: isDark ? '#DDD6FE' : '#5B21B6',
          fontSize: 13.5, fontWeight: 600, lineHeight: 1.5,
        }}>
          {s.welcomeBack}
        </Box>
      )}

      <Box sx={cardSx(isDark)}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{s.faqTitle}</Typography>
          <Button
            size="small"
            href={`mailto:${status.payment.supportEmail}?subject=${encodeURIComponent(`Smart Basket Pro ${request.reference}`)}`}
            startIcon={<SupportAgentRoundedIcon sx={{ fontSize: 16 }} />}
            sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: PRO_PURPLE, minWidth: 0, gap: 0.5 }}
          >
            {s.helpLink}
          </Button>
        </Box>
        <FaqItem q={s.faq1q} a={s.faq1a} isDark={isDark} />
        <FaqItem q={s.faq2q} a={s.faq2a} isDark={isDark} />
        <FaqItem q={s.faq3q} a={s.faq3a} isDark={isDark} />
      </Box>

      <Button fullWidth disabled={busy} onClick={onCancel} sx={{ ...ghostCtaSx, fontSize: 12.5 }}>
        {s.changePlan}
      </Button>

      {/* פס תחתון דביק: "שילמתי" מופיע רק אחרי שנלחץ קישור התשלום (ביט/PayBox) -
          לפני זה עדיין אין מה לאשר. בהעברה בנקאית אין קישור ללחוץ עליו, אז
          הכפתור זמין מיד. */}
      {(!url || leftForPayment) && (
        <Box sx={{
          position: 'sticky', bottom: 'calc(-28px - env(safe-area-inset-bottom))', zIndex: 2, mx: -2, px: 2, pt: 1.5,
          pb: 'calc(12px + env(safe-area-inset-bottom))',
          background: isDark
            ? 'linear-gradient(to top, #0B1220 70%, rgba(11,18,32,0))'
            : 'linear-gradient(to top, #F8FAFC 70%, rgba(248,250,252,0))',
        }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textAlign: 'center', mb: 0.75 }}>
            {s.payStep3}
          </Typography>
          <Button
            variant="contained" fullWidth disabled={busy} onClick={() => { haptic('medium'); setConfirmOpen(true); }}
            sx={{
              ...primaryCtaSx,
              ...(backFromPayment && {
                animation: 'sbPaidPulse 1.6s ease-in-out infinite',
                '@keyframes sbPaidPulse': {
                  '0%, 100%': { boxShadow: '0 8px 22px rgba(124,58,237,0.38)' },
                  '50%': { boxShadow: '0 8px 30px rgba(124,58,237,0.7)' },
                },
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }),
            }}
          >
            {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : s.paidCta}
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 0.9, color: 'text.disabled' }}>
            <LockRoundedIcon sx={{ fontSize: 13 }} />
            <Typography sx={{ fontSize: 11.5 }}>{s.paidHint}</Typography>
          </Box>
        </Box>
      )}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: '22px', bgcolor: isDark ? '#0F172A' : '#fff', width: 'min(340px, calc(100vw - 40px))' } }}
      >
        <Box sx={{ p: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 900 }}>{s.confirmTitle}</Typography>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.65 }}>
            {s.confirmBody.replace('{amount}', fmt(request.amount))}
          </Typography>
          <Box dir="ltr" sx={{ alignSelf: 'center', px: 1.5, py: 0.6, borderRadius: '10px', bgcolor: soft, color: PRO_PURPLE, fontWeight: 900, letterSpacing: 1.4, fontSize: 16 }}>
            {request.reference}
          </Box>
          <Button
            variant="contained" fullWidth sx={{ ...primaryCtaSx, mt: 1 }}
            onClick={() => { setConfirmOpen(false); onPaid(); }}
          >
            {s.confirmYes}
          </Button>
          <Button fullWidth onClick={() => setConfirmOpen(false)} sx={ghostCtaSx}>{s.confirmNo}</Button>
        </Box>
      </Dialog>
    </Box>
  );
};
