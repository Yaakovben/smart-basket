import { Button, Typography } from '@mui/material';
import { MemberAvatar } from './MemberAvatar';
import type { Member, User } from '../types';

interface MembersButtonProps {
  members: (Member | User)[];
  onClick: () => void;
}

export const MembersButton = ({ members, onClick }: MembersButtonProps) => {
  const firstMember = members[0];
  return (
    <Button
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'rgba(255,255,255,0.15)',
        borderRadius: 5,
        px: 2,
        py: 0.75,
        pl: 1,
        textTransform: 'none',
        '&:hover': {
          bgcolor: 'rgba(255,255,255,0.25)'
        }
      }}
    >
      <MemberAvatar member={firstMember} size={28} index={0} />
      <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600 }}>
        {members.length} חברים
      </Typography>
    </Button>
  );
};
