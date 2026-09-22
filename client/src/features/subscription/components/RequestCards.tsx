import { Box, Typography, Button } from '@mui/material';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import type { SubscriptionRequestDto, SubscriptionRequestStatus } from '../../../services/api/subscription.api';
import type { SubscriptionStrings } from '../subscription.strings';
import { cardSx, sectionLabelSx, ghostCtaSx, PRO_PURPLE } from '../subscription.styles';

const STATUS_COLOR: Record<SubscriptionRequestStatus, string> = {
  pending: '#6B7280', reported: '#7C3AED', approved: '#059669', rejected: '#DC2626', cancelled: '#6B7280',
};

const statusLabel = (st: SubscriptionRequestStatus, s: SubscriptionStrings) => ({
  pending: s.statusPending, reported: s.statusReported, approved: s.statusApproved,
  rejected: s.statusRejected, cancelled: s.statusCancelled,
}[st]);

const STATUS_ICON: Record<SubscriptionRequestStatus, typeof CheckRoundedIcon> = {
  pending: ScheduleRoundedIcon, reported: ScheduleRoundedIcon, approved: CheckRoundedIcon,
  rejected: CloseRoundedIcon, cancelled: CloseRoundedIcon,
};

const fmtDate = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

interface ReportedProps {
  request: SubscriptionRequestDto;
  s: SubscriptionStrings;
  isDark: boolean;
  locale: string;
}

// תשלום שדווח וממתין לאישור אדמין - מסך רגוע ואמין, בלי הבטחת זמן שלא קיימת.
export const ReportedCard = ({ request, s, isDark, locale }: ReportedProps) => (
  <Box sx={{ ...cardSx(isDark), textAlign: 'center', py: 3.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
    <Box sx={{
      width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: isDark ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.10)', color: '#7C3AED',
    }}>
      <HourglassTopRoundedIcon sx={{
        fontSize: 28,
        animation: 'sbHourglass 2.4s ease-in-out infinite',
        '@keyframes sbHourglass': { '0%, 40%': { transform: 'rotate(0deg)' }, '60%, 100%': { transform: 'rotate(180deg)' } },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }} />
    </Box>
    <Typography sx={{ fontSize: 17, fontWeight: 800 }}>{s.reportedTitle}</Typography>
    <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.6, maxWidth: 320 }}>{s.reportedBody}</Typography>
    <Box sx={{ mt: 1, px: 1.5, py: 0.9, borderRadius: '12px', bgcolor: 'action.hover', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>{s.reportedRef}</Typography>
      <Typography dir="ltr" sx={{ fontSize: 17, fontWeight: 800, letterSpacing: 1.2, color: PRO_PURPLE }}>{request.reference}</Typography>
      <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>
        ₪{request.amount} · {s.reportedSince} {fmtDate(request.reportedAt ?? request.createdAt, locale)}
      </Typography>
    </Box>
  </Box>
);

interface ApprovedProps { expiryDate?: string; s: SubscriptionStrings; isDark: boolean; onDismiss: () => void }

// שלב סופי אמיתי: מוצג במקום ReportedCard ברגע שהאישור מגיע בזמן שהמשתמש
// עדיין בעמוד - מסך מנוחה שאומר "זהו, נגמר", לא רק חלון קופץ שנעלם. תואם
// את StepIndicator (step=4, כל השלבים מסומנים) שמוצג ישר מעליו.
export const ApprovedCard = ({ expiryDate, s, isDark, onDismiss }: ApprovedProps) => (
  <Box sx={{ ...cardSx(isDark), textAlign: 'center', py: 3.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
    <Box sx={{
      width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: isDark ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.10)', color: PRO_PURPLE,
    }}>
      <CheckRoundedIcon sx={{ fontSize: 30 }} />
    </Box>
    <Typography sx={{ fontSize: 17, fontWeight: 800 }}>{s.paidWelcomeTitle}</Typography>
    <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.6, maxWidth: 320 }}>
      {expiryDate ? s.paidWelcomeBody.replace('{date}', expiryDate) : s.paidWelcomeBodyPermanent}
    </Typography>
    <Button onClick={onDismiss} sx={{ ...ghostCtaSx, mt: 0.5 }}>{s.welcomeCta}</Button>
  </Box>
);

interface RejectedProps { request: SubscriptionRequestDto; s: SubscriptionStrings; isDark: boolean }

export const RejectedNotice = ({ request, s, isDark }: RejectedProps) => (
  <Box sx={{
    ...cardSx(isDark), display: 'flex', gap: 1.25, alignItems: 'flex-start',
    borderColor: isDark ? 'rgba(248,113,113,0.35)' : 'rgba(220,38,38,0.25)',
    bgcolor: isDark ? 'rgba(220,38,38,0.08)' : '#FEF2F2',
  }}>
    <ErrorOutlineRoundedIcon sx={{ color: '#DC2626', fontSize: 22, mt: '2px' }} />
    <Box>
      <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: isDark ? '#FCA5A5' : '#B91C1C' }}>{s.rejectedTitle}</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.4, lineHeight: 1.55 }}>
        {request.adminNote || s.rejectedBody}
      </Typography>
    </Box>
  </Box>
);

interface HistoryProps { history: SubscriptionRequestDto[]; s: SubscriptionStrings; isDark: boolean; locale: string }

export const HistoryCard = ({ history, s, isDark, locale }: HistoryProps) => {
  const items = history.filter((h) => h.status !== 'pending');
  if (items.length === 0) return null;
  return (
    <Box sx={cardSx(isDark)}>
      <Typography sx={sectionLabelSx}>{s.historyTitle}</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((h, i) => (
          <Box key={h.id} sx={{
            display: 'flex', alignItems: 'center', gap: 1, py: 1.1,
            borderTop: i === 0 ? 'none' : '1px solid', borderColor: 'divider',
          }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                ₪{h.amount} · {h.months === 1 ? s.month1 : h.months === 3 ? s.month3 : s.month12}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>{fmtDate(h.createdAt, locale)} · <span dir="ltr">{h.reference}</span></Typography>
            </Box>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 1, py: '2px', borderRadius: '999px', fontSize: 11, fontWeight: 800,
              color: STATUS_COLOR[h.status], bgcolor: `${STATUS_COLOR[h.status]}1A`,
            }}>
              {(() => { const Icon = STATUS_ICON[h.status]; return <Icon sx={{ fontSize: 12 }} />; })()}
              {statusLabel(h.status, s)}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

interface UnavailableProps { s: SubscriptionStrings; isDark: boolean; email: string; onBack: () => void }

export const PaymentUnavailableCard = ({ s, isDark, email, onBack }: UnavailableProps) => (
  <Box sx={{ ...cardSx(isDark), textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 3 }}>
    <Box sx={{
      width: 52, height: 52, borderRadius: '50%', mb: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: isDark ? 'rgba(124,58,237,0.16)' : 'rgba(124,58,237,0.09)', color: PRO_PURPLE,
    }}>
      <MailOutlineRoundedIcon sx={{ fontSize: 24 }} />
    </Box>
    <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{s.payUnavailableTitle}</Typography>
    <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.6 }}>{s.payUnavailableBody}</Typography>
    <Button
      variant="contained"
      href={`mailto:${email}?subject=${encodeURIComponent('Smart Basket Pro')}`}
      sx={{ mt: 1, borderRadius: '12px', textTransform: 'none', fontWeight: 800, bgcolor: PRO_PURPLE, '&:hover': { bgcolor: '#6D28D9' } }}
    >
      {s.contactUs}
    </Button>
    <Button onClick={onBack} sx={ghostCtaSx}>{s.changePlan}</Button>
  </Box>
);
