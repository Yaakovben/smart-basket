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
  // צבע ה-shimmer ב-hex - דיפולט טורקיז. שימושי להתאמת הצבע לסקציה (התראות = כתום וכו').
  color?: string;
}

export const ShimmerBlock = ({
  width = '100%',
  height = 16,
  radius = 8,
  circle,
  sx,
  color = '#14B8A6',
}: ShimmerBlockProps) => {
  const rgb = hexToRgb(color);
  return (
    <Box sx={{
      width: circle ? height : width,
      height,
      borderRadius: circle ? '50%' : radius,
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
}

export const ShimmerList = ({ count = 4, rowHeight = 64, gap = 10, color }: ShimmerListProps) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${gap}px`, width: '100%' }}>
    {Array.from({ length: count }).map((_, i) => (
      <ShimmerBlock key={i} height={rowHeight} radius={14} color={color} />
    ))}
  </Box>
);

ShimmerBlock.displayName = 'ShimmerBlock';
ShimmerList.displayName = 'ShimmerList';
