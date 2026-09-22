import { Box, Typography } from '@mui/material';
import AllInclusiveRoundedIcon from '@mui/icons-material/AllInclusiveRounded';
import type { SubscriptionStatus } from '../../../services/api/subscription.api';
import type { SubscriptionStrings } from '../subscription.strings';
import { cardSx, sectionLabelSx, PRO_PURPLE, PRO_SOFT } from '../subscription.styles';

interface Props {
  status: SubscriptionStatus;
  s: SubscriptionStrings;
  isDark: boolean;
}

// שורה אחת: תווית + ערך חינמי + ערך Pro. פשוט וברור - מספר מול "ללא הגבלה",
// לא טבלת ✓/∞ עמוסה (שהוסרה קודם כי כפלה את PerksGrid ובלבלה יותר משהסבירה).
const Row = ({ label, freeValue, isDark }: { label: string; freeValue: number; isDark: boolean }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', gap: 1, py: 0.85,
    borderBottom: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
    '&:last-of-type': { borderBottom: 'none' },
  }}>
    <Typography sx={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
    <Typography sx={{ width: 44, textAlign: 'center', fontSize: 13, fontWeight: 800 }}>{freeValue}</Typography>
    <Box sx={{
      width: 78, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3,
      py: 0.3, borderRadius: '999px', bgcolor: isDark ? 'rgba(124,58,237,0.18)' : PRO_SOFT,
    }}>
      <AllInclusiveRoundedIcon sx={{ fontSize: 13, color: PRO_PURPLE }} />
      <Typography sx={{ fontSize: 11, fontWeight: 800, color: PRO_PURPLE }}>{'∞'}</Typography>
    </Box>
  </Box>
);

// טבלת "מה כלול" - תמיד מוצגת (גם למשתמש Pro), כדי שברור בכל רגע מה ההבדל
// בין התוכניות, לא רק ברגע השדרוג. limits מגיע מהשרת תמיד עם ערכי החינמי
// (גם כשהמשתמש בפועל Pro), ראו routes/subscription.routes.ts.
export const PlanComparisonTable = ({ status, s, isDark }: Props) => {
  if (!status.limits) return null;
  const { limits } = status;
  const rows = [
    { label: s.compareLists, value: limits.maxOwnedLists },
    { label: s.compareGroups, value: limits.maxGroupMembers },
    { label: s.compareAi, value: limits.maxAiRequestsPerDay },
    { label: s.comparePriceChecks, value: limits.maxPriceComparisonsPerDay },
  ];
  return (
    <Box sx={cardSx(isDark)}>
      <Typography sx={sectionLabelSx}>{s.compareTitle}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ width: 44, textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: 'text.disabled' }}>
          {s.compareFree}
        </Typography>
        <Typography sx={{ width: 78, textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: PRO_PURPLE }}>
          {s.comparePro}
        </Typography>
      </Box>
      {rows.map(r => <Row key={r.label} label={r.label} freeValue={r.value} isDark={isDark} />)}
    </Box>
  );
};
