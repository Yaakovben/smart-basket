import { Box } from '@mui/material';
import { ShimmerBlock } from '../../../global/components';

// שלד טעינה של מסך "שימוש במאגר", באותו מבנה ובאותם גדלים כמו התוכן האמיתי:
// כרטיס עם מד עגול ותגית סטטוס, שלושה אריחי נתונים, כרטיס סיכום ושורות.
// הרדיוסים זהים לתוכן (borderRadius 3 ו-2 ב-theme של 12 הם 36 ו-24 פיקסלים).

const cardSx = (isDark: boolean) => ({
  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
  border: '1px solid', borderColor: 'divider',
});

// שורה בסגנון DbHealthCollectionRow / CloudinaryMetricRow: עיגול, שתי שורות טקסט ופס
const RowSkeleton = ({ isDark }: { isDark: boolean }) => (
  <Box sx={{ ...cardSx(isDark), display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 1.5, mb: 1, borderRadius: '24px' }}>
    <ShimmerBlock circle height={40} />
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75, pt: 0.25 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <ShimmerBlock width="45%" height={13} radius={6} />
        <ShimmerBlock width={52} height={12} radius={6} />
      </Box>
      <ShimmerBlock width="30%" height={10} radius={5} />
      <ShimmerBlock height={4} radius={2} />
    </Box>
  </Box>
);

// הכרטיס הראשי: מד עגול בגודל 180, תגית סטטוס ושורת טקסט
const HeroSkeleton = ({ isDark }: { isDark: boolean }) => (
  <Box sx={{ ...cardSx(isDark), p: 3, mb: 2, borderRadius: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <ShimmerBlock circle height={180} />
    <ShimmerBlock width={220} height={46} radius={24} sx={{ mt: 2 }} />
    <ShimmerBlock width={200} height={11} radius={6} sx={{ mt: 1.75 }} />
  </Box>
);

export const DbHealthSkeleton = ({ variant, isDark }: { variant: 'mongo' | 'cloudinary'; isDark: boolean }) => (
  <Box aria-busy sx={{ py: 0 }}>
    <HeroSkeleton isDark={isDark} />
    {variant === 'mongo' ? (
      <>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {[0, 1, 2].map(i => <ShimmerBlock key={i} height={76} radius={24} sx={{ flex: 1 }} />)}
        </Box>
        <Box sx={{ ...cardSx(isDark), p: 2, mb: 2, borderRadius: '24px' }}>
          <ShimmerBlock width={80} height={11} radius={6} sx={{ mb: 1.5 }} />
          <ShimmerBlock height={28} radius={24} sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            {[0, 1, 2].map(i => <ShimmerBlock key={i} width={70} height={10} radius={5} />)}
          </Box>
        </Box>
        {[0, 1, 2, 3].map(i => <RowSkeleton key={i} isDark={isDark} />)}
      </>
    ) : (
      [0, 1, 2, 3].map(i => <RowSkeleton key={i} isDark={isDark} />)
    )}
  </Box>
);
