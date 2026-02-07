import { Avatar, Box } from '@mui/material';
import { MEMBER_COLORS } from '../helpers';
import type { Member, User } from '../types';

interface MemberAvatarProps {
  member: Member | User;
  size?: number;
  index?: number;
  isOnline?: boolean;
}

export const MemberAvatar = ({ member, size = 36, index = 0, isOnline = false }: MemberAvatarProps) => {
  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <Avatar
        sx={{
          width: size,
          height: size,
          bgcolor: MEMBER_COLORS[index % MEMBER_COLORS.length],
          fontSize: size * 0.4,
          fontWeight: 700,
          lineHeight: 1,
          border: isOnline ? '2px solid #22C55E' : '2px solid white',
          boxSizing: 'border-box',
          boxShadow: isOnline
            ? '0 0 0 0 rgba(34, 197, 94, 0.4)'
            : '0 2px 4px rgba(0,0,0,0.1)',
          animation: isOnline ? 'presence-ring 2s ease-in-out infinite' : 'none',
          '@keyframes presence-ring': {
            '0%, 100%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.4)' },
            '50%': { boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.15)' },
          },
        }}
      >
        {member.name.charAt(0)}
      </Avatar>
    </Box>
  );
};
