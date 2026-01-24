import type { MemberAvatarProps } from '../types';
import { MEMBER_COLORS } from '../helpers';

export function MemberAvatar({ member, size = 36, index = 0 }: MemberAvatarProps) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: MEMBER_COLORS[index % MEMBER_COLORS.length],
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: size * 0.4,
      fontWeight: '700',
      border: '2px solid white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      {member.name.charAt(0)}
    </div>
  );
}
