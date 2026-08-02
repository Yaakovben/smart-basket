import { Box } from '@mui/material';
import { ShimmerList, ShimmerBlock } from '../../../global/components';
import { COMMON_STYLES } from '../../../global/helpers';

interface InsightsLoadingStateProps {
  isDark: boolean;
}

// מסך טעינה ראשוני של התובנות - שלד (skeleton) שתואם לעיצוב העמוד האמיתי
// כדי למנוע קפיצה ויזואלית ברגע שהנתונים מגיעים.
export const InsightsLoadingState = ({ isDark }: InsightsLoadingStateProps) => {
  return (
    <Box sx={{ height: '100dvh', bgcolor: 'background.default', pb: 4, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
      {/* הדר: באנר עליון - גרדיאנט תואם בדיוק לעמוד האמיתי, מונע קפיצה ויזואלית.
          הבלוקים בפנים משתמשים ב-ShimmerBlock לעקביות עם שאר האפליקציה. */}
      <Box sx={{
        background: isDark ? COMMON_STYLES.gradients.header.dark : COMMON_STYLES.gradients.header.light,
        p: '48px 16px 16px',
        borderRadius: '0 0 24px 24px',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <ShimmerBlock width={40} height={40} circle color="#FFFFFF" />
          <ShimmerBlock width={140} height={26} radius={8} color="#FFFFFF" />
          <Box sx={{ width: 40 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 0.75, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: '12px', p: 0.5 }}>
          {[1, 2, 3, 4].map(i => (
            <Box key={i} sx={{ flex: 1 }}>
              <ShimmerBlock height={34} radius={8} color="#FFFFFF" />
            </Box>
          ))}
        </Box>
      </Box>
      {/* תוכן: שורת בחירת רשימה + רשימת כרטיסי השוואה */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <ShimmerBlock height={48} radius={12} />
        <ShimmerList count={4} rowHeight={72} gap={10} />
      </Box>
    </Box>
  );
};
