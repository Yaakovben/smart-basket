import { Avatar } from '@mui/material';
import { MEMBER_COLORS } from '../helpers';
import type { Member, User } from '../types';

interface MemberAvatarProps {
  member: Member | User;
  size?: number;
  index?: number;
}

export const MemberAvatar = ({ member, size = 36, index = 0 }: MemberAvatarProps) => {
  return (
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
  );
};
