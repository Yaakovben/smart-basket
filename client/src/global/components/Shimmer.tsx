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

interface ShimmerBlockProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  circle?: boolean;
  sx?: object;
}

export const ShimmerBlock = ({
  width = '100%',
  height = 16,
  radius = 8,
  circle,
  sx,
}: ShimmerBlockProps) => (
  <Box sx={{
    width: circle ? height : width,
    height,
    borderRadius: circle ? '50%' : radius,
    background: 'linear-gradient(90deg, rgba(20,184,166,0.08) 0%, rgba(20,184,166,0.18) 50%, rgba(20,184,166,0.08) 100%)',
    backgroundSize: '200% 100%',
    animation: `${shimmer} 1.6s ease-in-out infinite`,
    ...sx,
  }} />
);

interface ShimmerListProps {
  count?: number;
  rowHeight?: number;
  gap?: number;
}

export const ShimmerList = ({ count = 4, rowHeight = 64, gap = 10 }: ShimmerListProps) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${gap}px`, width: '100%' }}>
    {Array.from({ length: count }).map((_, i) => (
      <ShimmerBlock key={i} height={rowHeight} radius={14} />
    ))}
  </Box>
);

ShimmerBlock.displayName = 'ShimmerBlock';
ShimmerList.displayName = 'ShimmerList';
