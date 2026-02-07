import { Box, Button, Typography } from '@mui/material';
import { MemberAvatar } from './MemberAvatar';
import type { Member, User } from '../types';

interface MembersButtonProps {
  members: (Member | User)[];
  currentUserId?: string;
  onClick: () => void;
  onlineUserIds?: Set<string>;
}

const MAX_VISIBLE = 3;
const AVATAR_SIZE = 28;
const AVATAR_OVERLAP = 10; // How much each avatar overlaps the previous one

export const MembersButton = ({ members, currentUserId, onClick, onlineUserIds }: MembersButtonProps) => {
  // Sort members so current user is FIRST (appears on left, on top)
  const sortedMembers = currentUserId
    ? [...members].sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return 0;
      })
    : members;

  const visibleMembers = sortedMembers.slice(0, MAX_VISIBLE);
  const extraCount = members.length - MAX_VISIBLE;
  const showExtra = extraCount > 0;

  // Calculate container width based on number of avatars only
  const containerWidth = AVATAR_SIZE + (visibleMembers.length - 1) * (AVATAR_SIZE - AVATAR_OVERLAP);

  return (
    <Button
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        bgcolor: 'rgba(255,255,255,0.15)',
        borderRadius: '16px',
        px: 1,
        py: 0.5,
        minWidth: 'auto',
        textTransform: 'none',
        '&:hover': {
          bgcolor: 'rgba(255,255,255,0.25)'
        }
      }}
    >
      {showExtra && (
        <Typography sx={{ color: 'white', fontSize: 12, fontWeight: 700 }}>
          +{extraCount}
        </Typography>
      )}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: containerWidth,
          height: AVATAR_SIZE,
          position: 'relative'
        }}
      >
        {visibleMembers.map((member, index) => (
          <Box
            key={member.id}
            sx={{
              position: 'absolute',
              left: index * (AVATAR_SIZE - AVATAR_OVERLAP),
              zIndex: MAX_VISIBLE - index
            }}
          >
            <MemberAvatar
              member={member}
              size={AVATAR_SIZE}
              index={index}
              isOnline={member.id !== currentUserId && onlineUserIds?.has(member.id)}
            />
          </Box>
        ))}
      </Box>
    </Button>
  );
};
