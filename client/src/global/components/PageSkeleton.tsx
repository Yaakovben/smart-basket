import { Box, Skeleton } from '@mui/material';
import { useSettings } from '../context/SettingsContext';
import { COMMON_STYLES } from '../helpers';

const SKELETON_ITEMS = [1, 2, 3, 4, 5] as const;

/** שלד טעינה לדפים - מחליף גרדיאנט ריק בתצוגה שנראית כמו דף אמיתי.
 * הגרדיאנט חייב להיות זהה בדיוק לזה של HomeHeader/ListHeader (כולל מצב
 * כהה) - לפני התיקון היה כאן גוון ירוק-אמרלד (#10B981) שנשאר מלפני שהמותג
 * עבר לטורקיז, ובנוסף לא היה מודע כלל למצב כהה. */
export const PageSkeleton = () => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';

  return (
  <Box sx={{
    height: { xs: '100dvh', sm: '100vh' },
    display: 'flex',
    flexDirection: 'column',
    bgcolor: 'background.default',
    maxWidth: { xs: '100%', sm: 500, md: 600 },
    mx: 'auto',
  }}>
    {/* Header skeleton - padding/מבנה זהים בכוונה ל-HomeHeader (כולל
        env(safe-area-inset-top)), אחרת השלד נמוך מהעמוד האמיתי בטלפון עם
        notch/Dynamic Island וגורם לקפיצת גובה ברגע שהנתונים מגיעים. */}
    <Box sx={{
      background: isDark ? COMMON_STYLES.gradients.header.dark : COMMON_STYLES.gradients.header.light,
      p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 20px', sm: '48px 20px 20px' },
      borderRadius: '0 0 24px 24px',
      flexShrink: 0,
    }}>
      {/* Top bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Skeleton variant="circular" width={44} height={44} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
          <Box>
            <Skeleton variant="text" width={70} height={16} sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '4px' }} />
            <Skeleton variant="text" width={120} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '4px', mt: 0.3 }} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="circular" width={44} height={44} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
          <Skeleton variant="circular" width={44} height={44} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
        </Box>
      </Box>

      {/* Search bar skeleton */}
      <Skeleton variant="rounded" width="100%" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '12px', mb: 1.5 }} />

      {/* Tabs skeleton - 3 טאבים (הכל/שלי/קבוצות), כמו בעמוד האמיתי */}
      <Box sx={{ display: 'flex', gap: 1, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: '12px', p: 0.6 }}>
        <Skeleton variant="rounded" width="33.33%" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.25)', borderRadius: '10px' }} />
        <Skeleton variant="rounded" width="33.33%" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.15)', borderRadius: '10px' }} />
        <Skeleton variant="rounded" width="33.33%" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.15)', borderRadius: '10px' }} />
      </Box>
    </Box>

    {/* Content skeleton */}
    <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Section label */}
      <Skeleton variant="text" width={80} height={18} sx={{ borderRadius: '4px' }} />

      {/* List items */}
      {SKELETON_ITEMS.map((i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.75,
            p: 2,
            borderRadius: '16px',
            bgcolor: 'background.paper',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: '14px', flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={`${60 + (i % 3) * 15}%`} height={22} sx={{ borderRadius: '4px' }} />
            <Skeleton variant="text" width={`${35 + (i % 2) * 20}%`} height={16} sx={{ borderRadius: '4px' }} />
          </Box>
          <Skeleton variant="circular" width={32} height={32} sx={{ flexShrink: 0 }} />
        </Box>
      ))}
    </Box>
  </Box>
  );
};
