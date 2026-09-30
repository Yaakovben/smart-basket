import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { ShimmerBlock } from '../../../global/components';

interface InsightsLoadingStateProps {
  isDark: boolean;
  // הכותרת האמיתית (InsightsHeader) - סטטית ולא תלויה בנתונים, ולכן מוצגת כבר עכשיו
  header: ReactNode;
}

// מסך טעינה ראשוני של התובנות, באותו מבנה ובאותם גדלים כמו העמוד האמיתי:
// הכותרת עצמה, סרגל הטאבים מתחתיה, כרטיס הסיכום, ואז כרטיסי התוכן. כך אין
// קפיצה כשהנתונים מגיעים.
export const InsightsLoadingState = ({ isDark, header }: InsightsLoadingStateProps) => (
  <Box aria-busy sx={{ height: 'var(--app-height, 100dvh)', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', overflow: 'hidden' }}>
    {header}

    {/* סרגל הטאבים: מסגרת מעוגלת 18 עם ארבעה טאבים (אייקון ומילה) */}
    <Box sx={{ px: 2, mb: 2 }}>
      <Box sx={{
        display: 'flex', gap: 0.4, p: '5px', borderRadius: '18px',
        bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      }}>
        {[0, 1, 2, 3].map(i => (
          <Box key={i} sx={{ flex: 1, minHeight: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <ShimmerBlock circle height={20} />
            <ShimmerBlock width={34} height={9} radius={5} />
          </Box>
        ))}
      </Box>
    </Box>

    {/* כרטיס הסיכום: אריח 56 ושתי שורות טקסט */}
    <Box sx={{ px: 2, mb: 1.5 }}>
      <Box sx={{
        p: 2.25, borderRadius: '20px', minHeight: 84, display: 'flex', alignItems: 'center', gap: 1.75,
        border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
      }}>
        <ShimmerBlock width={56} height={56} radius={16} />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <ShimmerBlock width="55%" height={14} radius={7} />
          <ShimmerBlock width="80%" height={11} radius={6} />
        </Box>
      </Box>
    </Box>

    {/* כרטיסי התוכן */}
    <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <ShimmerBlock height={64} radius={16} />
      {[0, 1, 2].map(i => (
        <Box key={i} sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75, borderRadius: '16px',
          border: '1px solid', borderColor: 'divider', bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
        }}>
          <ShimmerBlock width={44} height={44} radius={12} />
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
            <ShimmerBlock width="50%" height={13} radius={6} />
            <ShimmerBlock width="32%" height={10} radius={5} />
          </Box>
          <ShimmerBlock width={54} height={22} radius={8} />
        </Box>
      ))}
    </Box>
  </Box>
);
