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
  const dotSize = Math.max(size * 0.3, 8);
  const avatarColor = member.avatarColor;
  const avatarEmoji = member.avatarEmoji;

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <Avatar
        sx={{
          width: size,
          height: size,
          bgcolor: avatarColor || MEMBER_COLORS[index % MEMBER_COLORS.length],
          fontSize: avatarEmoji ? size * 0.5 : size * 0.4,
          fontWeight: 700,
          lineHeight: 1,
          border: '2px solid white',
          boxSizing: 'border-box',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        {avatarEmoji || member.name.charAt(0)}
      </Avatar>
      {isOnline && (
        <Box
          sx={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            bgcolor: '#22C55E',
            border: '2px solid white',
            boxSizing: 'border-box',
          }}
        />
      )}
    </Box>
  );
};
