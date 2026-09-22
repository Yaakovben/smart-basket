import { Box, Typography } from '@mui/material';
import PlaylistAddCheckRoundedIcon from '@mui/icons-material/PlaylistAddCheckRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import type { SubscriptionStrings } from '../subscription.strings';
import { cardSx, sectionLabelSx, PRO_PURPLE } from '../subscription.styles';

interface Props { s: SubscriptionStrings; isDark: boolean }

const PERKS = [
  { icon: PlaylistAddCheckRoundedIcon, key: 'perkLists', grad: 'linear-gradient(135deg,#8B5CF6,#6D28D9)' },
  { icon: GroupsRoundedIcon, key: 'perkGroups', grad: 'linear-gradient(135deg,#A78BFA,#7C3AED)' },
  { icon: AutoAwesomeRoundedIcon, key: 'perkAi', grad: 'linear-gradient(135deg,#C4B5FD,#8B5CF6)' },
  { icon: SellRoundedIcon, key: 'perkPrice', grad: 'linear-gradient(135deg,#6D28D9,#4C1D95)' },
] as const;

// ארבע יתרונות Pro כאריחים צבעוניים - "מה מקבלים" במבט אחד.
export const PerksGrid = ({ s, isDark }: Props) => (
  <Box sx={cardSx(isDark)}>
    <Typography sx={sectionLabelSx}>{s.perksTitle}</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
      {PERKS.map(({ icon: Icon, key, grad }, i) => (
        <Box key={key} sx={{
          display: 'flex', alignItems: 'center', gap: 1.1, p: 1.1, borderRadius: '14px',
          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
          animation: `sbPerkIn 0.45s ${150 + i * 80}ms cubic-bezier(0.34,1.56,0.64,1) both`,
          '@keyframes sbPerkIn': { from: { opacity: 0, transform: 'scale(0.85)' }, to: { opacity: 1, transform: 'scale(1)' } },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: '11px', flexShrink: 0, background: grad,
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(15,23,42,0.18)',
          }}>
            <Icon sx={{ fontSize: 19, color: '#fff' }} />
          </Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>{s[key]}</Typography>
        </Box>
      ))}
    </Box>
  </Box>
);

// שורת אמון: מה שבאמת נכון בתהליך - בלי חיוב אוטומטי, אימות אישי, הארכה בלי הפסד ימים.
export const TrustRow = ({ s, isDark }: Props) => {
  const items = [
    { icon: BlockRoundedIcon, text: s.trustNoAuto },
    { icon: VerifiedUserRoundedIcon, text: s.trustManual },
    { icon: EventRepeatRoundedIcon, text: s.trustExtend },
  ];
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75 }}>
      {items.map(({ icon: Icon, text }) => (
        <Box key={text} sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, textAlign: 'center', px: 0.5, py: 1.1,
          borderRadius: '14px', bgcolor: isDark ? 'rgba(124,58,237,0.10)' : 'rgba(124,58,237,0.06)',
        }}>
          <Icon sx={{ fontSize: 19, color: PRO_PURPLE }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, color: 'text.secondary' }}>{text}</Typography>
        </Box>
      ))}
    </Box>
  );
};
