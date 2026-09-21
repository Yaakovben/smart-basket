import { useState } from 'react';
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

const CopyRow = ({ label, value, s, emphasize, isDark }: { label: string; value: string; s: SubscriptionStrings; emphasize?: boolean; isDark: boolean }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* אין הרשאת לוח - המשתמש יכול להעתיק ידנית */ }
  };
  return (
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
      <ButtonBase
        onClick={copy}
        aria-label={s.copy}
        sx={{
          flexShrink: 0, gap: 0.5, px: 1.1, py: 0.6, borderRadius: '10px',
          fontSize: 12, fontWeight: 700, color: copied ? '#059669' : PRO_PURPLE,
          bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
          border: '1px solid', borderColor: 'divider',
        }}
      >
        {copied ? <CheckRoundedIcon sx={{ fontSize: 15 }} /> : <ContentCopyRoundedIcon sx={{ fontSize: 14 }} />}
        {copied ? s.copied : s.copy}
      </ButtonBase>
    </Box>
  );
};

// מסך התשלום: פרטים אמיתיים מהשרת בלבד (קישור/QR/טלפון ביט או PayBox), קוד
// הפניה להערה, ודיווח "שילמתי" שמעביר את הבקשה לאישור אדמין.
export const PaymentPanel = ({ status, request, s, isDark, busy, onChangeMethod, onPaid, onCancel }: Props) => {
  const { bit, paybox, receiverName } = status.payment;
  const method = request.method === 'paybox' ? 'paybox' : 'bit';
  const url = method === 'bit' ? bit?.url : paybox?.url;
  const phone = method === 'bit' ? bit?.phone : null;
  const both = !!bit && !!paybox;
  const monthsLabel = request.months === 1 ? s.month1 : request.months === 3 ? s.month3 : s.month12;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ ...cardSx(isDark), textAlign: 'center', py: 2.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>{s.payAmount}</Typography>
        <Typography sx={{ fontSize: 40, fontWeight: 900, lineHeight: 1.15, color: PRO_PURPLE, fontVariantNumeric: 'tabular-nums' }}>
          ₪{fmt(request.amount)}
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{s.payFor} {monthsLabel}</Typography>
      </Box>

      <Box sx={cardSx(isDark)}>
        {both && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={sectionLabelSx}>{s.payMethod}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              {(['bit', 'paybox'] as const).map((m) => (
                <ButtonBase
                  key={m}
                  disabled={busy}
                  onClick={() => m !== method && onChangeMethod(m)}
                  sx={{
                    py: 1.1, borderRadius: '12px', fontWeight: 800, fontSize: 14,
                    border: '2px solid',
                    borderColor: m === method ? PRO_PURPLE : 'divider',
                    bgcolor: m === method ? (isDark ? 'rgba(124,58,237,0.16)' : 'rgba(124,58,237,0.07)') : 'transparent',
                    color: m === method ? PRO_PURPLE : 'text.primary',
                  }}
                >
                  {m === 'bit' ? s.payBit : s.payPaybox}
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
              variant="outlined"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, borderColor: PRO_PURPLE, color: PRO_PURPLE }}
            >
              {method === 'bit' ? s.payOpenBit : s.payOpenPaybox}
            </Button>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {phone && <CopyRow label={s.payPhone} value={phone} s={s} isDark={isDark} />}
          {receiverName && (
            <Box sx={{ px: 1.5, py: 0.5 }}>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>{s.payReceiver}</Typography>
              <Typography sx={{ fontSize: 14.5, fontWeight: 700 }}>{receiverName}</Typography>
            </Box>
          )}
          <CopyRow label={s.payReference} value={request.reference} s={s} emphasize isDark={isDark} />
          <Typography sx={{ fontSize: 12, color: 'text.secondary', px: 0.5 }}>{s.payReferenceHint}</Typography>
        </Box>
      </Box>

      <Button variant="contained" fullWidth disabled={busy} onClick={onPaid} sx={primaryCtaSx}>
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
