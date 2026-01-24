import type { MembersButtonProps } from '../types';
import { MemberAvatar } from './MemberAvatar';

export const MembersButton = ({ members, onClick }: MembersButtonProps) => {
  const firstMember = members[0];
  return (
    <button onClick={onClick} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'rgba(255,255,255,0.15)',
      border: 'none',
      borderRadius: '20px',
      padding: '6px 16px 6px 8px',
      cursor: 'pointer'
    }}>
      <MemberAvatar member={firstMember} size={28} index={0} />
      <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600' }}>{members.length} חברים</span>
    </button>
  );
}
