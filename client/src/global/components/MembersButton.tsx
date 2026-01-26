import { Box, Button, Typography } from '@mui/material';
import { MemberAvatar } from './MemberAvatar';
import type { Member, User } from '../types';

interface MembersButtonProps {
  members: (Member | User)[];
  currentUserId?: string;
  onClick: () => void;
}

const MAX_VISIBLE = 3;
const AVATAR_SIZE = 32;
const OVERLAP = 22; // 3/4 overlap so only 1/4 of each avatar shows

export const MembersButton = ({ members, currentUserId, onClick }: MembersButtonProps) => {
  // Sort members so current user is first
  const sortedMembers = currentUserId
    ? [...members].sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return 0;
      })
    : members;

  const visibleMembers = sortedMembers.slice(0, MAX_VISIBLE);
  const extraCount = members.length - MAX_VISIBLE;

  return (
    <Button
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'rgba(255,255,255,0.15)',
        borderRadius: '20px',
        px: 1.5,
        py: 0.5,
        minWidth: 'auto',
        textTransform: 'none',
        '&:hover': {
          bgcolor: 'rgba(255,255,255,0.25)'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        {visibleMembers.map((member, index) => (
          <Box
            key={member.id}
            sx={{
              marginLeft: index > 0 ? `-${OVERLAP}px` : 0,
              zIndex: MAX_VISIBLE - index,
              position: 'relative'
            }}
          >
            <MemberAvatar member={member} size={AVATAR_SIZE} index={index} />
          </Box>
        ))}
        {extraCount > 0 && (
          <Box
            sx={{
              marginLeft: `-${OVERLAP}px`,
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: '50%',
              bgcolor: 'rgba(0,0,0,0.4)',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 0
            }}
          >
            <Typography sx={{ color: 'white', fontSize: 11, fontWeight: 700 }}>
              +{extraCount}
            </Typography>
          </Box>
        )}
      </Box>
    </Button>
  );
};
