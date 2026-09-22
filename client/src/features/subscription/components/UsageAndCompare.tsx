import { Box, Typography, LinearProgress } from '@mui/material';
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
