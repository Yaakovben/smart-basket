import { useEffect, useState } from 'react';
import { Box, Typography, Button, ButtonBase, CircularProgress } from '@mui/material';
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
      flexShrink: 0, gap: 0.5, px: 1.1, py: 0.6, borderRadius: '10px',
      fontSize: 12, fontWeight: 700, color: copied ? '#059669' : PRO_PURPLE,
      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
      border: '1px solid', borderColor: copied ? '#059669' : 'divider',
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

const StepHeader = ({ n, title }: { n: number; title: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
    <Box sx={{
      width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: PRO_PURPLE, color: '#fff', fontSize: 12.5, fontWeight: 800,
    }}>{n}</Box>
    <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{title}</Typography>
  </Box>
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{
        ...cardSx(isDark), textAlign: 'center', py: 2.25,
        background: isDark
          ? 'linear-gradient(160deg, rgba(124,58,237,0.20), rgba(30,41,59,0.6))'
          : 'linear-gradient(160deg, #F5F3FF, #FFFFFF)',
      }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>{s.payAmount}</Typography>
        <Typography sx={{ fontSize: 42, fontWeight: 900, lineHeight: 1.15, color: PRO_PURPLE, fontVariantNumeric: 'tabular-nums' }}>
          ₪{fmt(request.amount)}
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.25 }}>{s.payFor} {monthsLabel}</Typography>
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
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{
              p: 1.25, bgcolor: '#fff', borderRadius: '18px', lineHeight: 0,
              border: '2px solid', borderColor: soft, boxShadow: '0 4px 16px rgba(124,58,237,0.12)',
            }}>
              <QRCodeSVG value={url} size={156} level="M" />
            </Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center' }}>{s.payScan}</Typography>
            <Button
              variant="contained"
              fullWidth
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setLeftForPayment(true)}
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 17 }} />}
              sx={{ borderRadius: '12px', py: 1.1, textTransform: 'none', fontWeight: 800, fontSize: 14.5, bgcolor: PRO_PURPLE, boxShadow: 'none', '&:hover': { bgcolor: '#6D28D9', boxShadow: 'none' } }}
            >
              {method === 'bit' ? s.payOpenBit : s.payOpenPaybox}
            </Button>
          </Box>
        )}
        {method === 'bank' && bank && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <CopyRow id="bankName" label={s.bankName} value={bank.bankName} {...rowProps} />
            <CopyRow id="bankBranch" label={s.bankBranch} value={bank.branch} {...rowProps} />
            <CopyRow id="bankAccount" label={s.bankAccount} value={bank.account} {...rowProps} />
          </Box>
        )}

        <Box sx={{ height: '1px', bgcolor: 'divider', my: 2 }} />

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

      <Button fullWidth disabled={busy} onClick={onCancel} sx={ghostCtaSx}>
        {s.changePlan}
      </Button>

      {/* פס תחתון דביק: "שילמתי" תמיד בהישג יד בלי לגלול */}
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
          variant="contained" fullWidth disabled={busy} onClick={onPaid}
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.9, color: 'text.disabled' }}>
          <LockRoundedIcon sx={{ fontSize: 13 }} />
          <Typography sx={{ fontSize: 11.5 }}>{s.paidHint}</Typography>
        </Box>
      </Box>
    </Box>
  );
};
