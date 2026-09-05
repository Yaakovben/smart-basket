import { useMemo, memo } from 'react';
import { Box, Button, Typography, useMediaQuery } from '@mui/material';
import { MemberAvatar } from './MemberAvatar';
import type { Member, User } from '../types';

interface MembersButtonProps {
  members: (Member | User)[];
  currentUserId?: string;
  onClick: () => void;
  onlineUserIds?: Set<string>;
}

const MAX_VISIBLE = 3;

export const MembersButton = memo(({ members, currentUserId, onClick, onlineUserIds }: MembersButtonProps) => {
  // גדלי האווטארים מתכווצים באותם ספי מסך כמו כפתורי הכותרת
  // (COMMON_STYLES.glassIconButton: 44 → 34 ב-≤360 → 30 ב-≤320). בלי זה,
  // במסך צר הכפתורים מתכווצים והאווטארים נשארים 28 - היחס ביניהם משתנה
  // וזה נראה לא אחיד בין מכשירים.
  const isTiny = useMediaQuery('(max-width:320px)');
  const isNarrow = useMediaQuery('(max-width:360px)');
  const avatarSize = isTiny ? 20 : isNarrow ? 24 : 28;
  const avatarOverlap = Math.round(avatarSize * 0.36);

  // המשתמש הנוכחי ראשון (מוצג משמאל, מעל)
  const sortedMembers = useMemo(() => currentUserId
    ? [...members].sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return 0;
      })
    : members,
  [members, currentUserId]);

  const visibleMembers = sortedMembers.slice(0, MAX_VISIBLE);
  const extraCount = members.length - MAX_VISIBLE;
  const showExtra = extraCount > 0;

  // רוחב מיכל לפי מספר אווטארים
  const containerWidth = avatarSize + (visibleMembers.length - 1) * (avatarSize - avatarOverlap);

  return (
    <Button
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        // גובה זהה *בדיוק* לכפתורי הזכוכית של הכותרת (כולל כפתור שיתוף
        // הסיסמה/הזמנה) - COMMON_STYLES.glassIconButton: 44 → 34 ב-≤360
        // → 30 ב-≤320. הרוחב נשאר לפי התוכן (אווטארים + "+N"). בלי זה
        // הכפתור הזה יצא נמוך יותר ונוצרה "קפיצה" בשורה.
        height: 44,
        minHeight: 44,
        py: 0,
        px: 1.25,
        minWidth: 'auto',
        flexShrink: 0,
        borderRadius: '16px',
        textTransform: 'none',
        bgcolor: 'rgba(255,255,255,0.2)',
        backdropFilter: 'blur(10px)',
        '&:hover': {
          bgcolor: 'rgba(255,255,255,0.3)'
        },
        '@media (max-width: 360px)': { height: 34, minHeight: 34, px: 1 },
        '@media (max-width: 320px)': { height: 30, minHeight: 30, px: 0.75 },
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
          height: avatarSize,
          position: 'relative'
        }}
      >
        {visibleMembers.map((member, index) => (
          <Box
            key={member.id}
            sx={{
              position: 'absolute',
              left: index * (avatarSize - avatarOverlap),
              zIndex: MAX_VISIBLE - index
            }}
          >
            <MemberAvatar
              member={member}
              size={avatarSize}
              index={index}
              isOnline={member.id !== currentUserId && onlineUserIds?.has(member.id)}
            />
          </Box>
        ))}
      </Box>
    </Button>
  );
});
MembersButton.displayName = 'MembersButton';
