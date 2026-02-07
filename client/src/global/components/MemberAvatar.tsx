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
          border: '2px solid white',
          boxSizing: 'border-box',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        {member.name.charAt(0)}
      </Avatar>
      {isOnline && (
        <Box
          sx={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: size * 0.32,
            height: size * 0.32,
            borderRadius: '50%',
            bgcolor: '#22C55E',
            border: '2px solid white',
            boxSizing: 'border-box',
            animation: 'presence-pulse 2s ease-in-out infinite',
            '@keyframes presence-pulse': {
              '0%, 100%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.4)' },
              '50%': { boxShadow: '0 0 0 3px rgba(34, 197, 94, 0)' },
            },
          }}
        />
      )}
    </Box>
  );
};
