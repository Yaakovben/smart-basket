/**
 * TopProgressBar - פס דק בראש המסך לסימון טעינה ברקע.
 *
 * דפוס סטנדרטי מודרני (YouTube, GitHub, Linear, Vercel) - מודיע למשתמש
 * שמשהו עובד ברקע בלי להפריע לתוכן הקיים.
 *
 * שימוש: <TopProgressBar active={isLoading} />
 */

import { Box, keyframes } from '@mui/material';

const slide = keyframes`
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(380%); }
`;

interface Props {
  active: boolean;
  color?: string;
}

export const TopProgressBar = ({ active, color = '#14B8A6' }: Props) => {
  if (!active) return null;
  return (
    <Box sx={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 3,
      zIndex: 10000,
      bgcolor: `${color}22`,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      <Box sx={{
        width: '35%',
        height: '100%',
        background: `linear-gradient(90deg, transparent, ${color}, ${color}, transparent)`,
        boxShadow: `0 0 8px ${color}80`,
        animation: `${slide} 1.4s ease-in-out infinite`,
      }} />
    </Box>
  );
};

TopProgressBar.displayName = 'TopProgressBar';
