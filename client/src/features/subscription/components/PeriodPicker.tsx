import { Box, Typography, ButtonBase } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import type { SubscriptionStatus } from '../../../services/api/subscription.api';
import type { SubscriptionStrings } from '../subscription.strings';
import { cardSx, sectionLabelSx, PRO_PURPLE } from '../subscription.styles';

interface Props {
  status: SubscriptionStatus;
  s: SubscriptionStrings;
  isDark: boolean;
  months: number;
  onChange: (months: number) => void;
}

export const priceFor = (status: SubscriptionStatus, months: number): number => {
  const { monthly, yearly } = status.catalog;
  if (months === 12 && yearly) return yearly;
  return Math.round(monthly * months * 100) / 100;
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

// בחירת תקופה. האפשרויות והמחירים מהשרת; תג "חיסכון" מוצג רק כשהשרת מחשב
// חיסכון אמיתי (מחיר שנתי שהוגדר ואכן נמוך מ-12 חודשים).
export const PeriodPicker = ({ status, s, isDark, months, onChange }: Props) => {
  const labels: Record<number, string> = { 1: s.month1, 3: s.month3, 12: s.month12 };
  const options = status.catalog.allowedMonths;

  return (
    <Box sx={cardSx(isDark)}>
      <Typography sx={sectionLabelSx}>{s.planTitle}</Typography>
      <Box role="radiogroup" sx={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 1 }}>
        {options.map((m) => {
          const selected = m === months;
          const total = priceFor(status, m);
          const perMonth = total / m;
          const savings = m === 12 ? status.catalog.yearlySavingsPercent : null;
          return (
            <ButtonBase
              key={m}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(m)}
              sx={{
                position: 'relative', flexDirection: 'column', gap: 0.25,
                minHeight: 92, px: 0.75, py: 1.5, borderRadius: '14px',
                border: '2px solid', textAlign: 'center',
                borderColor: selected ? PRO_PURPLE : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.1)'),
                bgcolor: selected ? (isDark ? 'rgba(124,58,237,0.16)' : 'rgba(124,58,237,0.07)') : 'transparent',
                transition: 'border-color 0.2s, background-color 0.2s, transform 0.2s, box-shadow 0.2s',
                transform: selected ? 'translateY(-2px)' : 'none',
                boxShadow: selected ? '0 8px 20px rgba(124,58,237,0.22)' : 'none',
                '&:active': { transform: 'scale(0.97)' },
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {savings ? (
                <Box sx={{
                  position: 'absolute', top: -9, px: 0.9, py: '1px', borderRadius: '999px',
                  bgcolor: '#F59E0B', color: '#4C1D95', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap',
                }}>
                  {s.saveBadge} {savings}%
                </Box>
              ) : null}
              {selected && (
                <CheckCircleRoundedIcon sx={{
                  position: 'absolute', top: 6, insetInlineEnd: 6, fontSize: 17, color: PRO_PURPLE,
                  animation: 'sbCheckPop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  '@keyframes sbCheckPop': { from: { transform: 'scale(0)' }, to: { transform: 'scale(1)' } },
                }} />
              )}
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary' }}>{labels[m]}</Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, color: selected ? PRO_PURPLE : 'text.primary' }}>
                ₪{fmt(total)}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                {m === 1 ? ' ' : `₪${fmt(Math.round(perMonth * 100) / 100)} ${s.perMonth}`}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1.5, lineHeight: 1.55 }}>
        {s.noAutoRenew}
      </Typography>
    </Box>
  );
};
