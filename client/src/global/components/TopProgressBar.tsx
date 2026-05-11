/**
 * TopProgressBar - פס דק בראש המסך לסימון טעינה ברקע.
 *
 * דפוס סטנדרטי מודרני (YouTube, GitHub, Linear, Vercel) - מודיע למשתמש
 * שמשהו עובד ברקע בלי להפריע לתוכן הקיים.
 *
 * שימוש: <TopProgressBar active={isLoading} />
 */

import { Box, keyframes } from '@mui/material';

const slidePrimary = keyframes`
  0%   { transform: translateX(-120%); }
  100% { transform: translateX(240%); }
`;

const slideSecondary = keyframes`
  0%   { transform: translateX(-160%); }
  100% { transform: translateX(280%); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.85; }
  50%      { opacity: 1; }
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
      top: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(72%, 420px)',
      height: 5,
      zIndex: 10000,
      bgcolor: `${color}1A`,
      borderRadius: 999,
      overflow: 'hidden',
      pointerEvents: 'none',
      boxShadow: `0 2px 8px ${color}33`,
      animation: `${pulse} 2s ease-in-out infinite`,
    }}>
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '45%',
        height: '100%',
        borderRadius: 999,
        background: `linear-gradient(90deg, transparent, ${color}, #5EEAD4, ${color}, transparent)`,
        boxShadow: `0 0 14px ${color}, 0 0 6px ${color}`,
        animation: `${slidePrimary} 1.4s ease-in-out infinite`,
      }} />
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '30%',
        height: '100%',
        borderRadius: 999,
        background: `linear-gradient(90deg, transparent, #5EEAD4, transparent)`,
        boxShadow: `0 0 10px #5EEAD4`,
        opacity: 0.75,
        animation: `${slideSecondary} 2.1s ease-in-out infinite`,
        animationDelay: '0.4s',
      }} />
    </Box>
  );
};

TopProgressBar.displayName = 'TopProgressBar';
