import { Box, Typography } from '@mui/material';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import type { SubscriptionStrings } from '../subscription.strings';
import { PRO_PURPLE } from '../subscription.styles';

interface Props { s: SubscriptionStrings; isDark: boolean }

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
