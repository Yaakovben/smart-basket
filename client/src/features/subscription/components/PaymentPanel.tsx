import { useEffect, useState } from 'react';
import { Box, Typography, Button, ButtonBase, CircularProgress } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import type { SubscriptionStatus, SubscriptionRequestDto, SubscriptionPayMethod } from '../../../services/api/subscription.api';
import type { SubscriptionStrings } from '../subscription.strings';
import { cardSx, sectionLabelSx, primaryCtaSx, ghostCtaSx, PRO_PURPLE } from '../subscription.styles';

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

// מסך התשלום: פרטים אמיתיים מהשרת בלבד (ביט/PayBox/העברה בנקאית), קוד הפניה
// להערה, ודיווח "שילמתי" שמעביר את הבקשה לאישור אדמין. כשהמשתמש חוזר לאפליקציה
// אחרי שפתח את אפליקציית התשלום, מזכירים לו ללחוץ "שילמתי".
export const PaymentPanel = ({ status, request, s, isDark, busy, onChangeMethod, onPaid, onCancel }: Props) => {
  const { bit, paybox, bank, receiverName } = status.payment;
  const { copiedKey, copy } = useCopy();
  const [leftForPayment, setLeftForPayment] = useState(false);
  const [backFromPayment, setBackFromPayment] = useState(false);

  useEffect(() => {
    if (!leftForPayment) return;
    const onVisible = () => { if (document.visibilityState === 'visible') setBackFromPayment(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [leftForPayment]);

  const methods = ([
    bit && 'bit', paybox && 'paybox', bank && 'bank',
  ].filter(Boolean)) as SubscriptionPayMethod[];
  const method = request.method;
  const methodLabel: Record<SubscriptionPayMethod, string> = { bit: s.payBit, paybox: s.payPaybox, bank: s.payBank };
  const url = method === 'bit' ? bit?.url : method === 'paybox' ? paybox?.url : null;
  const phone = method === 'bit' ? bit?.phone : null;
  const monthsLabel = request.months === 1 ? s.month1 : request.months === 3 ? s.month3 : s.month12;
  const rowProps = { s, isDark, copiedKey, onCopy: copy };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ ...cardSx(isDark), textAlign: 'center', py: 2.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>{s.payAmount}</Typography>
        <Typography sx={{ fontSize: 40, fontWeight: 900, lineHeight: 1.15, color: PRO_PURPLE, fontVariantNumeric: 'tabular-nums' }}>
          ₪{fmt(request.amount)}
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1 }}>{s.payFor} {monthsLabel}</Typography>
        <CopyChip copied={copiedKey === 'amount'} label={s.copyAmount} copiedLabel={s.copied} onClick={() => copy('amount', fmt(request.amount))} isDark={isDark} />
      </Box>

      <Box sx={cardSx(isDark)}>
        {methods.length > 1 && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={sectionLabelSx}>{s.payMethod}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${methods.length}, 1fr)`, gap: 1 }}>
              {methods.map((m) => (
                <ButtonBase
                  key={m}
                  disabled={busy}
                  onClick={() => m !== method && onChangeMethod(m)}
                  sx={{
                    py: 1.1, px: 0.5, borderRadius: '12px', fontWeight: 800, fontSize: 13.5, textAlign: 'center',
                    border: '2px solid',
                    borderColor: m === method ? PRO_PURPLE : 'divider',
                    bgcolor: m === method ? (isDark ? 'rgba(124,58,237,0.16)' : 'rgba(124,58,237,0.07)') : 'transparent',
                    color: m === method ? PRO_PURPLE : 'text.primary',
                  }}
                >
                  {methodLabel[m]}
                </ButtonBase>
              ))}
            </Box>
          </Box>
        )}

        {url && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25, mb: 2 }}>
            <Box sx={{ p: 1.5, bgcolor: '#fff', borderRadius: '16px', border: '1px solid rgba(15,23,42,0.08)', lineHeight: 0 }}>
              <QRCodeSVG value={url} size={164} level="M" />
            </Box>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', textAlign: 'center' }}>{s.payScan}</Typography>
            <Button
              variant="contained"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setLeftForPayment(true)}
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, bgcolor: PRO_PURPLE, boxShadow: 'none', '&:hover': { bgcolor: '#6D28D9', boxShadow: 'none' } }}
            >
              {method === 'bit' ? s.payOpenBit : s.payOpenPaybox}
            </Button>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {method === 'bank' && bank && (
            <>
              <CopyRow id="bankName" label={s.bankName} value={bank.bankName} {...rowProps} />
              <CopyRow id="bankBranch" label={s.bankBranch} value={bank.branch} {...rowProps} />
              <CopyRow id="bankAccount" label={s.bankAccount} value={bank.account} {...rowProps} />
            </>
          )}
          {phone && <CopyRow id="phone" label={s.payPhone} value={phone} {...rowProps} />}
          {receiverName && (
            <Box sx={{ px: 1.5, py: 0.5 }}>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>{s.payReceiver}</Typography>
              <Typography sx={{ fontSize: 14.5, fontWeight: 700 }}>{receiverName}</Typography>
            </Box>
          )}
          <CopyRow id="reference" label={s.payReference} value={request.reference} emphasize {...rowProps} />
          <Typography sx={{ fontSize: 12, color: 'text.secondary', px: 0.5 }}>{s.payReferenceHint}</Typography>
        </Box>
      </Box>

      {backFromPayment && (
        <Box sx={{
          px: 1.75, py: 1.25, borderRadius: '14px', textAlign: 'center',
          bgcolor: isDark ? 'rgba(124,58,237,0.16)' : 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.35)', color: isDark ? '#DDD6FE' : '#5B21B6',
          fontSize: 13.5, fontWeight: 600, lineHeight: 1.5,
        }}>
          {s.welcomeBack}
        </Box>
      )}

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
      <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center', px: 1, lineHeight: 1.55 }}>
        {s.paidHint}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: 'text.disabled', textAlign: 'center', px: 1 }}>
        {s.paymentDetailsNote}
      </Typography>
      <Button fullWidth disabled={busy} onClick={onCancel} sx={ghostCtaSx}>
        {s.changePlan}
      </Button>
    </Box>
  );
};
