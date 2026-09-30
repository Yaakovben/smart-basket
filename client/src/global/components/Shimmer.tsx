/**
 * Shimmer - placeholder אלגנטי לתוכן בטעינה.
 *
 * דפוס סטנדרטי (Facebook, Instagram, WhatsApp) - מציג "רוח רפאים" של
 * התוכן הצפוי עם גל אור שעובר עליו. רגוע, מוכר, ושימושי כי המשתמש
 * רואה מיד את המבנה של מה שיופיע.
 *
 * שני רכיבים:
 *   ShimmerBlock - בלוק יחיד (rect/circle) עם shimmer
 *   ShimmerList  - מספר שורות באותה צורה (לטעינת רשימה)
 */

import { Box, keyframes } from '@mui/material';

const shimmer = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// פונקציית עזר - הופכת hex לתצוגת RGB עם אלפא, כדי לבנות גרדיאנט בכל גוון רצוי
const hexToRgb = (hex: string): string => {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  return `${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255}`;
};

interface ShimmerBlockProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  circle?: boolean;
  sx?: object;
  // צבע ה-shimmer ב-hex - דיפולט אפור ניטרלי לאחידות בכל האפליקציה.
  // ניתן לדרוס לסקציות נושאיות (כתום להתראות, צהוב לחיזוק רוחני וכו').
  color?: string;
}

export const ShimmerBlock = ({
  width = '100%',
  height = 16,
  radius = 8,
  circle,
  sx,
  color = '#94A3B8',
}: ShimmerBlockProps) => {
  const rgb = hexToRgb(color);
  return (
    <Box sx={{
      width: circle ? height : width,
      height,
      // radius בפיקסלים. מספר חשוף היה מוכפל ב-MUI בעיגול הבסיסי של ה-theme
      // (12), ו-radius={16} יצא 192px: כל בלוק נראה כמו קפסולה ולא כמו התוכן.
      borderRadius: circle ? '50%' : typeof radius === 'number' ? `${radius}px` : radius,
      background: `linear-gradient(90deg, rgba(${rgb},0.08) 0%, rgba(${rgb},0.18) 50%, rgba(${rgb},0.08) 100%)`,
      backgroundSize: '200% 100%',
      animation: `${shimmer} 1.6s ease-in-out infinite`,
      ...sx,
    }} />
  );
};

interface ShimmerListProps {
  count?: number;
  rowHeight?: number;
  gap?: number;
  color?: string;
  // row: כרטיס עם אריח, שתי שורות טקסט ותגית בסוף (כמו רוב השורות באפליקציה)
  // text: כרטיס עם שורות טקסט בלבד (ציטוטים, הודעות)
  variant?: 'row' | 'text';
}

// רשימת שלדים בצורת השורות האמיתיות ולא בלוקים אפורים שטוחים: כרטיס עם מסגרת
// ובתוכו אותם חלקים שיופיעו, כך שהמעבר לתוכן לא משנה את מה שרואים.
export const ShimmerList = ({ count = 4, rowHeight = 64, gap = 10, color, variant = 'row' }: ShimmerListProps) => {
  const tile = Math.max(28, Math.min(48, rowHeight - 22));
  return (
    <Box aria-busy sx={{ display: 'flex', flexDirection: 'column', gap: `${gap}px`, width: '100%' }}>
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} sx={{
          minHeight: rowHeight, px: 1.5, py: 1.25, borderRadius: '14px', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', gap: 1.25,
          bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
        }}>
          {variant === 'row' ? (
            <>
              <ShimmerBlock width={tile} height={tile} radius={12} color={color} />
              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <ShimmerBlock width={`${58 - (i % 3) * 8}%`} height={13} radius={6} color={color} />
                <ShimmerBlock width={`${36 - (i % 2) * 6}%`} height={10} radius={5} color={color} />
              </Box>
              <ShimmerBlock width={52} height={20} radius={8} color={color} />
            </>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <ShimmerBlock width="92%" height={11} radius={6} color={color} />
              <ShimmerBlock width={`${70 - (i % 3) * 10}%`} height={11} radius={6} color={color} />
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};

ShimmerBlock.displayName = 'ShimmerBlock';
ShimmerList.displayName = 'ShimmerList';
