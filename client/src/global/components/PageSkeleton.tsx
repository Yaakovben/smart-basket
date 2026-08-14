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
    <Box sx={{ flex: 1, p: 2, pb: 9, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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

    {/* AI assistant FAB skeleton - אותו מיקום/גודל בדיוק כמו AiAssistantFab
        האמיתי, כדי שלא תהיה "קפיצה" ברגע שהעמוד האמיתי עולה מתחתיו. */}
    <Box sx={{
      position: 'fixed',
      bottom: 'max(88px, calc(env(safe-area-inset-bottom) + 78px))',
      left: 16,
      zIndex: 1090,
    }}>
      <Skeleton variant="circular" width={48} height={48} />
    </Box>

    {/* Bottom nav skeleton - בר + FAB מרכזי, אותו מבנה בדיוק כמו HomeBottomNav */}
    <Box sx={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 1000,
      bgcolor: 'background.paper',
      borderTop: '1px solid',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      boxShadow: isDark
        ? '0 -8px 24px rgba(0,0,0,0.4), 0 -2px 6px rgba(0,0,0,0.25)'
        : '0 -8px 24px rgba(0,0,0,0.08), 0 -2px 6px rgba(0,0,0,0.04)',
    }}>
      <Box sx={{
        width: '100%', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 1.5, py: 0.85, px: 3.5, minHeight: 50,
      }}>
        <Box sx={{ flex: 1, maxWidth: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width={36} height={14} sx={{ borderRadius: '4px' }} />
        </Box>
        <Box sx={{ width: 64, flexShrink: 0 }} />
        <Box sx={{ flex: 1, maxWidth: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width={48} height={14} sx={{ borderRadius: '4px' }} />
        </Box>
      </Box>
    </Box>
    <Box sx={{
      position: 'fixed',
      bottom: 'max(32px, env(safe-area-inset-bottom))',
      left: 0, right: 0,
      display: 'flex', justifyContent: 'center',
      zIndex: 1100,
    }}>
      <Skeleton variant="circular" width={56} height={56} sx={{ bgcolor: 'rgba(20,184,166,0.35)' }} />
    </Box>
  </Box>
  );
};
