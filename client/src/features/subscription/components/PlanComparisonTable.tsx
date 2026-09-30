import type { ComponentType } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import AllInclusiveRoundedIcon from '@mui/icons-material/AllInclusiveRounded';
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import type { SubscriptionStatus } from '../../../services/api/subscription.api';
import type { SubscriptionStrings } from '../subscription.strings';
import { cardSx, sectionLabelSx, PRO_PURPLE, PRO_SOFT } from '../subscription.styles';

interface Props {
  status: SubscriptionStatus;
  s: SubscriptionStrings;
  isDark: boolean;
}

const PRO_GRADIENT = 'linear-gradient(135deg, #6D28D9, #A855F7)';
const FREE_COL = 56;
const PRO_COL = 96;

const meterColor = (ratio: number) => (ratio >= 1 ? '#EF4444' : ratio >= 0.8 ? '#F59E0B' : PRO_PURPLE);

// שורה אחת: אייקון ותווית, ערך החינמי בתגית, ו"ללא הגבלה" בגרדיאנט של Pro.
// used מוצג רק לשורות עם שימוש יומי אמיתי (AI/השוואות מחיר) ורק למשתמש
// חינמי: פס התקדמות דק מתחת לשורה.
const Row = ({ label, Icon, freeValue, used, isDark, unlimitedLabel }: {
  label: string; Icon: ComponentType<{ sx?: object }>; freeValue: number; used?: number; isDark: boolean; unlimitedLabel: string;
}) => {
  const ratio = used !== undefined && freeValue > 0 ? Math.min(1, used / freeValue) : null;
  return (
    <Box sx={{
      py: 1.1,
      borderBottom: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
      '&:last-of-type': { borderBottom: 'none' },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{
          width: 30, height: 30, borderRadius: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: isDark ? 'rgba(124,58,237,0.18)' : PRO_SOFT,
        }}>
          <Icon sx={{ fontSize: 17, color: PRO_PURPLE }} />
        </Box>
        <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: 'text.primary' }}>{label}</Typography>
        <Box sx={{ width: FREE_COL, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <Box sx={{
            minWidth: 34, px: 0.75, py: '3px', borderRadius: '9px', textAlign: 'center',
            bgcolor: isDark ? 'rgba(255,255,255,0.07)' : '#F1F5F9',
            border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
          }}>
            <Typography sx={{
              fontSize: 14, fontWeight: 900, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums',
              color: ratio !== null ? meterColor(ratio) : 'text.primary',
            }}>
              {ratio !== null ? `${used}/${freeValue}` : freeValue}
            </Typography>
          </Box>
        </Box>
        <Box sx={{
          width: PRO_COL, flexShrink: 0, py: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4,
          borderRadius: '999px', background: PRO_GRADIENT,
          boxShadow: '0 3px 10px rgba(124,58,237,0.25)',
        }}>
          <AllInclusiveRoundedIcon sx={{ fontSize: 14, color: '#fff', flexShrink: 0 }} />
          <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>{unlimitedLabel}</Typography>
        </Box>
      </Box>
      {ratio !== null && (
        <LinearProgress
          variant="determinate"
          value={ratio * 100}
          sx={{
            height: 4, borderRadius: 2, mt: 0.75, ml: 0, bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: meterColor(ratio), transition: 'transform 0.4s ease' },
          }}
        />
      )}
    </Box>
  );
};

// טבלת "מה כלול" - תמיד מוצגת (גם למשתמש Pro), כדי שברור בכל רגע מה ההבדל
// בין התוכניות, לא רק ברגע השדרוג. limits מגיע מהשרת תמיד עם ערכי החינמי
// (גם כשהמשתמש בפועל Pro), ראו routes/subscription.routes.ts. usage מגיע
// רק למשתמש חינמי - אז כרטיס "שימוש" נפרד התייתר ואוחד לכאן.
export const PlanComparisonTable = ({ status, s, isDark }: Props) => {
  if (!status.limits) return null;
  const { limits, usage } = status;
  const rows = [
    { label: s.compareLists, Icon: ListAltRoundedIcon, value: limits.maxOwnedLists },
    { label: s.compareGroups, Icon: GroupsRoundedIcon, value: limits.maxGroupMembers },
    { label: s.compareAi, Icon: AutoAwesomeRoundedIcon, value: limits.maxAiRequestsPerDay, used: usage ? Math.min(usage.aiToday, limits.maxAiRequestsPerDay) : undefined },
    { label: s.comparePriceChecks, Icon: LocalOfferRoundedIcon, value: limits.maxPriceComparisonsPerDay, used: usage ? Math.min(usage.priceToday, limits.maxPriceComparisonsPerDay) : undefined },
  ];
  return (
    <Box sx={{ ...cardSx(isDark), position: 'relative', overflow: 'hidden' } as object}>
      {/* פס דק בגרדיאנט של Pro בראש הכרטיס */}
      <Box aria-hidden sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: PRO_GRADIENT }} />
      <Typography sx={sectionLabelSx}>{s.compareTitle}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ width: FREE_COL, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'text.disabled', flexShrink: 0 }}>
          {s.compareFree}
        </Typography>
        <Typography sx={{
          width: PRO_COL, textAlign: 'center', fontSize: 11.5, fontWeight: 900, flexShrink: 0,
          background: PRO_GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>
          ✦ {s.comparePro}
        </Typography>
      </Box>
      {rows.map(r => <Row key={r.label} label={r.label} Icon={r.Icon} freeValue={r.value} used={r.used} isDark={isDark} unlimitedLabel={s.compareUnlimited} />)}
      {usage && <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 1.25 }}>{s.usageResets}</Typography>}
    </Box>
  );
};
