import { memo } from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import type { List, User, Member } from '../../../../global/types';
import { Modal, MemberAvatar } from '../../../../global/components';
import { useSettings } from '../../../../global/context/SettingsContext';

// ===== מודאל חברים =====
interface MembersModalProps {
  isOpen: boolean;
  list: List;
  members: (Member | User)[];
  isOwner: boolean;
  onClose: () => void;
  onRemoveMember: (id: string, name: string) => void;
  onLeaveGroup: () => void;
  onlineUserIds?: Set<string>;
  currentUserId?: string;
}

export const MembersModal = memo(({
  isOpen,
  list,
  members,
  isOwner,
  onClose,
  onRemoveMember,
  onLeaveGroup,
  onlineUserIds,
  currentUserId
}: MembersModalProps) => {
  const { t } = useSettings();

  if (!isOpen) return null;

  return (
    <Modal title={t('members')} onClose={onClose}>
      {members.map((m, i) => (
        <Box
          key={m.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 1.5,
            borderBottom: i < members.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider'
          }}
        >
          <MemberAvatar member={m} size={44} index={i} isOnline={m.id !== currentUserId && onlineUserIds?.has(m.id)} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.primary' }}>{m.name}</Typography>
              {m.id === list.owner.id && (
                <Chip label={t('admin')} size="small" sx={{ bgcolor: 'warning.light', color: 'warning.dark', height: 22 }} />
              )}
              {m.id !== currentUserId && onlineUserIds?.has(m.id) && (
                <Chip
                  label={t('online')}
                  size="small"
                  sx={{ bgcolor: '#ECFDF5', color: '#059669', height: 22, fontSize: 11, fontWeight: 600 }}
                />
              )}
            </Box>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</Typography>
          </Box>
          {isOwner && m.id !== list.owner.id && (
            <Button
              onClick={() => onRemoveMember(m.id, m.name)}
              size="small"
              sx={{
                bgcolor: 'rgba(239, 68, 68, 0.1)',
                color: 'error.main',
                fontSize: 11,
                fontWeight: 600,
                px: 1.5,
                py: 0.5,
                minWidth: 'auto',
                borderRadius: '6px',
                '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' }
              }}
              aria-label={`${t('removeMember')} ${m.name}`}
            >
              {t('removeMember')}
            </Button>
          )}
        </Box>
      ))}
      {!isOwner && list.isGroup && (
        <Button
          fullWidth
          onClick={onLeaveGroup}
          sx={{ mt: 2.5, bgcolor: 'rgba(239, 68, 68, 0.1)', color: 'error.main', fontWeight: 600, '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' } }}
          aria-label={t('leaveGroup')}
        >
          {t('leaveGroup')}
        </Button>
      )}
    </Modal>
  );
});

MembersModal.displayName = 'MembersModal';
