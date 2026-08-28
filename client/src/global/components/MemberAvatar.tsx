import { Box } from '@mui/material';
import { MEMBER_COLORS } from '../helpers';
import { AvatarRing } from './AvatarRing';
import type { Member, User } from '../types';

interface MemberAvatarProps {
  member: Member | User;
  size?: number;
  index?: number;
  isOnline?: boolean;
}

export const MemberAvatar = ({ member, size = 36, index = 0, isOnline = false }: MemberAvatarProps) => {
  const dotSize = Math.max(size * 0.3, 8);
  const avatarColor = member.avatarColor || MEMBER_COLORS[index % MEMBER_COLORS.length];
  const seedId = ('id' in member && member.id) || member.name;

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <AvatarRing
        emoji={member.avatarEmoji}
        initials={member.name.charAt(0)}
        color={avatarColor}
        seedId={seedId}
        size={size}
      />
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
