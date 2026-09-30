import { Box } from '@mui/material';
import { ShimmerBlock } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { cardSx } from '../subscription.styles';

// שלד באותה פריסה בדיוק של העמוד, כדי שהמעבר לתוכן האמיתי לא יזיז שום דבר:
//  • כרטיס המנוי (רדיוס 24, מינימום 156): אריח אייקון, תגית, כותרת, שורת תאריך וטבעת
//  • כרטיס ההצטרפות: אריח אייקון, כותרת ושתי שורות, ותגית "בקרוב"
//  • טבלת "מה כלול": כותרת, שורת עמודות וארבע שורות (אייקון, תווית, ערך ותגית)
const PURPLE = '#7C3AED';

export const SubscriptionSkeleton = () => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  return (
    <Box aria-busy="true" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{
        minHeight: 156, p: 2.5, borderRadius: '24px', display: 'flex', alignItems: 'center', gap: 2,
        bgcolor: isDark ? 'rgba(124,58,237,0.16)' : 'rgba(124,58,237,0.08)',
      }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <ShimmerBlock width={44} height={44} radius={14} color={PURPLE} />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
              <ShimmerBlock width={54} height={16} radius={999} color={PURPLE} />
              <ShimmerBlock width="70%" height={18} radius={8} color={PURPLE} />
            </Box>
          </Box>
          <ShimmerBlock width="85%" height={12} radius={6} color={PURPLE} />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <ShimmerBlock circle height={84} color={PURPLE} />
          <ShimmerBlock width={50} height={9} radius={5} color={PURPLE} />
        </Box>
      </Box>

      <Box sx={cardSx(isDark)}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <ShimmerBlock width={42} height={42} radius={13} />
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.7 }}>
            <ShimmerBlock width="60%" height={15} radius={7} />
            <ShimmerBlock width="95%" height={11} radius={6} />
            <ShimmerBlock width="75%" height={11} radius={6} />
          </Box>
        </Box>
        <ShimmerBlock height={36} radius={12} sx={{ mt: 1.75 }} />
      </Box>

      <Box sx={cardSx(isDark)}>
        <ShimmerBlock width={110} height={11} radius={6} sx={{ mb: 1.5 }} />
        {[0, 1, 2, 3].map(i => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.1 }}>
            <ShimmerBlock width={30} height={30} radius={10} />
            <ShimmerBlock width="36%" height={12} radius={6} sx={{ flex: 1 }} />
            <ShimmerBlock width={34} height={26} radius={9} sx={{ mx: 1.4 }} />
            <ShimmerBlock width={96} height={22} radius={999} />
          </Box>
        ))}
      </Box>
    </Box>
  );
};
