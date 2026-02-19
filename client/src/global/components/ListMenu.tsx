import { memo } from 'react';
import { Box, Typography, Menu, MenuItem, Divider } from '@mui/material';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSettings } from '../context/SettingsContext';

interface ListMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  isGroup: boolean;
  isOwner: boolean;
  isMuted: boolean;
  mainNotificationsOff: boolean;
  onToggleMute: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh?: () => void;
  stopPropagation?: boolean;
}

export const ListMenu = memo(({
  anchorEl,
  open,
  onClose,
  isGroup,
  isOwner,
  isMuted,
  mainNotificationsOff,
  onToggleMute,
  onEdit,
  onDelete,
  onRefresh,
  stopPropagation = false
}: ListMenuProps) => {
  const { t } = useSettings();

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={(e: React.SyntheticEvent) => { if (stopPropagation) e.stopPropagation?.(); onClose(); }}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            minWidth: 240,
            mt: 1,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            py: 0.5,
            overflow: 'visible'
          }
        }
      }}
    >
      {/* Refresh */}
      {onRefresh && (
        <MenuItem
          onClick={() => { onClose(); onRefresh(); }}
          sx={{ py: 1.5, px: 2.5, gap: 1.5 }}
        >
          <RefreshIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
            {t('refresh')}
          </Typography>
        </MenuItem>
      )}

      {/* Divider after refresh if group follows */}
      {onRefresh && isGroup && <Divider />}

      {/* Mute Toggle — only for groups */}
      {isGroup && (
        <Box sx={{ px: 1.5, py: 1 }}>
          <Box
            onClick={() => { if (!mainNotificationsOff) { onClose(); onToggleMute(); } }}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 2, py: 1.5,
              borderRadius: '12px',
              bgcolor: isMuted || mainNotificationsOff
                ? 'rgba(239,68,68,0.08)'
                : 'rgba(20,184,166,0.08)',
              border: '1px solid',
              borderColor: isMuted || mainNotificationsOff
                ? 'rgba(239,68,68,0.15)'
                : 'rgba(20,184,166,0.15)',
              cursor: mainNotificationsOff ? 'default' : 'pointer',
              opacity: mainNotificationsOff ? 0.5 : 1,
              transition: 'all 0.15s ease',
              '&:active': mainNotificationsOff ? {} : { transform: 'scale(0.97)' }
            }}
          >
            {isMuted || mainNotificationsOff
              ? <VolumeOffIcon sx={{ color: mainNotificationsOff ? 'grey.400' : 'error.main', fontSize: 22 }} />
              : <VolumeUpIcon sx={{ color: 'primary.main', fontSize: 22 }} />
            }
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: isMuted ? 'error.main' : 'text.primary' }}>
                {isMuted ? t('unmuteGroup') : t('muteGroup')}
              </Typography>
              {mainNotificationsOff && (
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {t('notificationsOff')}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* Divider before owner actions */}
      {isOwner && (isGroup || onRefresh) && <Divider />}

      {isOwner && (
        <MenuItem
          onClick={() => { onClose(); onEdit(); }}
          sx={{ py: 1.5, px: 2.5, gap: 1.5 }}
        >
          <EditIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
            {isGroup ? t('editGroup') : t('editList')}
          </Typography>
        </MenuItem>
      )}

      {isOwner && (
        <MenuItem
          onClick={() => { onClose(); onDelete(); }}
          sx={{ py: 1.5, px: 2.5, gap: 1.5 }}
        >
          <DeleteOutlineIcon sx={{ color: 'error.main', fontSize: 22 }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'error.main' }}>
            {isGroup ? t('deleteGroup') : t('deleteList')}
          </Typography>
        </MenuItem>
      )}
    </Menu>
  );
});

ListMenu.displayName = 'ListMenu';
