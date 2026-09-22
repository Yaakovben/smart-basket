import { Box, Typography, LinearProgress } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import AllInclusiveRoundedIcon from '@mui/icons-material/AllInclusiveRounded';
import type { SubscriptionStatus } from '../../../services/api/subscription.api';
import type { SubscriptionStrings } from '../subscription.strings';
import { cardSx, sectionLabelSx, PRO_PURPLE } from '../subscription.styles';

interface Props {
  status: SubscriptionStatus;
  s: SubscriptionStrings;
  isDark: boolean;
}

const meterColor = (ratio: number) => (ratio >= 1 ? '#EF4444' : ratio >= 0.8 ? '#F59E0B' : PRO_PURPLE);

const Meter = ({ label, used, max, s }: { label: string; used: number; max: number; s: SubscriptionStrings }) => {
  const ratio = max > 0 ? Math.min(1, used / max) : 0;
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.6 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: meterColor(ratio) }}>
          {used} {s.usageOf} {max}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={ratio * 100}
        sx={{
          height: 7, borderRadius: 4, bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: meterColor(ratio), transition: 'transform 0.4s ease' },
        }}
      />
    </Box>
  );
};

// שימוש יומי אמיתי מול המכסה (מהשרת) + מגבלות קבועות. רק למשתמש חינמי.
export const UsageCard = ({ status, s, isDark }: Props) => {
  if (!status.limits || !status.usage) return null;
  const { limits, usage } = status;
  return (
    <Box sx={cardSx(isDark)}>
      <Typography sx={sectionLabelSx}>{s.usageTitle}</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
        <Meter label={s.usageAi} used={Math.min(usage.aiToday, limits.maxAiRequestsPerDay)} max={limits.maxAiRequestsPerDay} s={s} />
        <Meter label={s.usagePrice} used={Math.min(usage.priceToday, limits.maxPriceComparisonsPerDay)} max={limits.maxPriceComparisonsPerDay} s={s} />
      </Box>
      <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 1.5 }}>{s.usageResets}</Typography>
    </Box>
  );
};

// טבלת השוואה חינמי מול Pro - המספרים מגיעים מהמגבלות האמיתיות בשרת.
export const CompareCard = ({ status, s, isDark }: Props) => {
  const l = status.limits;
  const rows: Array<{ label: string; free: string }> = l ? [
    { label: s.cmpLists, free: String(l.maxOwnedLists) },
    { label: s.cmpMembers, free: String(l.maxGroupMembers) },
    { label: s.cmpAi, free: String(l.maxAiRequestsPerDay) },
    { label: s.cmpPrice, free: String(l.maxPriceComparisonsPerDay) },
  ] : [];
  if (rows.length === 0) return null;

  return (
    <Box sx={cardSx(isDark)}>
      <Typography sx={sectionLabelSx}>{s.compareTitle}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 64px 84px', alignItems: 'center', rowGap: 0 }}>
        <Box />
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', textAlign: 'center', pb: 0.75 }}>{s.compareFree}</Typography>
        <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: PRO_PURPLE, textAlign: 'center', pb: 0.75 }}>✦ {s.comparePro}</Typography>
        {rows.map((r) => (
          <Box key={r.label} sx={{ display: 'contents' }}>
            <Typography sx={{ fontSize: 13.5, py: 1.1, borderTop: '1px solid', borderColor: 'divider' }}>
              {r.label}
            </Typography>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: 'text.secondary', textAlign: 'center', py: 1.1, borderTop: '1px solid', borderColor: 'divider' }}>
              {r.free}
            </Typography>
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.6, py: 1.1,
              borderTop: '1px solid', borderColor: 'divider', color: PRO_PURPLE, fontWeight: 800, fontSize: 12.5,
              bgcolor: isDark ? 'rgba(124,58,237,0.10)' : 'rgba(124,58,237,0.06)',
            }}>
              <AllInclusiveRoundedIcon sx={{ fontSize: 16 }} />
              <CheckRoundedIcon sx={{ fontSize: 15 }} />
            </Box>
          </Box>
        ))}
      </Box>
      <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 1.25 }}>{s.unlimited}</Typography>
    </Box>
  );
};
