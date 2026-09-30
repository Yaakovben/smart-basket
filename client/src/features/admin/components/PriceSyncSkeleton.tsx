import { Box } from '@mui/material';
import { ShimmerBlock } from '../../../global/components';

// שלד עמוד סנכרון המחירים, באותו מבנה כמו התוכן: שורת כרטיסי סיכום, שורת
// "עודכן", כפתורי הפעולה, סרגל הסינון, ורשימת הרשתות בתוך מסגרת עם כותרת
// ושורה לכל רשת (אייקון סטטוס, שם ונתונים).
export const PriceSyncSkeleton = ({ isDark }: { isDark: boolean }) => (
  <Box aria-busy sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    <Box sx={{ display: 'flex', gap: 1, overflow: 'hidden' }}>
      {[0, 1, 2].map(i => <ShimmerBlock key={i} height={72} radius={14} sx={{ flex: '0 0 auto', minWidth: 120, width: 'calc((100% - 16px) / 3)' }} />)}
    </Box>
    <ShimmerBlock width={150} height={11} radius={6} sx={{ mx: 'auto' }} />
    <Box sx={{ display: 'flex', gap: 1 }}>
      <ShimmerBlock height={46} radius={12} sx={{ flex: 1 }} />
      <ShimmerBlock height={46} radius={12} sx={{ flex: 1 }} />
    </Box>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
      {[62, 54, 70, 58, 50].map((w, i) => <ShimmerBlock key={i} width={w} height={24} radius={999} />)}
    </Box>
    <Box sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1, bgcolor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid', borderColor: 'divider' }}>
        <ShimmerBlock width={170} height={11} radius={6} />
      </Box>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.1, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
          <ShimmerBlock circle height={15} />
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
            <ShimmerBlock width="36%" height={13} radius={6} />
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              <ShimmerBlock width={70} height={10} radius={5} />
              <ShimmerBlock width={56} height={10} radius={5} />
              <ShimmerBlock width={48} height={10} radius={5} />
            </Box>
          </Box>
          <ShimmerBlock circle height={16} />
        </Box>
      ))}
    </Box>
  </Box>
);
