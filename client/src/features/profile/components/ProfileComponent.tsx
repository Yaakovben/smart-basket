import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, TextField, Button, Paper } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import type { User } from '../../../global/types';
import { ConfirmModal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { COMMON_STYLES, SIZES } from '../../../global/helpers';

interface ProfilePageProps {
  user: User;
  onUpdateUser: (user: Partial<User>) => void;
  onLogout: () => void;
}

const AVATAR_COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981'];
const AVATAR_EMOJIS = ['', '😊', '😎', '🦁', '🐻', '🦊', '🌟', '⚡'];

// Reusable styles
const glassButtonSx = {
  ...COMMON_STYLES.glassButton,
  ...SIZES.iconButton.sm,
  color: 'white'
};

const labelSx = {
  fontSize: 12,
  fontWeight: 600,
  color: 'text.secondary',
  mb: 0.75
};

export const ProfileComponent = ({ user, onUpdateUser, onLogout }: ProfilePageProps) => {
  const navigate = useNavigate();
  const { t } = useSettings();
  const [editProfile, setEditProfile] = useState<{ name: string; email: string; avatarColor: string; avatarEmoji: string } | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const openEditProfile = useCallback(() => {
    setEditProfile({
      name: user.name,
      email: user.email,
      avatarColor: user.avatarColor || '#14B8A6',
      avatarEmoji: user.avatarEmoji || ''
    });
  }, [user.name, user.email, user.avatarColor, user.avatarEmoji]);

  const handleSave = useCallback(() => {
    if (editProfile) {
      onUpdateUser(editProfile);
      setEditProfile(null);
    }
  }, [editProfile, onUpdateUser]);

  const handleLogout = useCallback(() => {
    onLogout();
    navigate('/login');
  }, [onLogout, navigate]);

  return (
    <Box sx={{ height: { xs: '100dvh', sm: '100vh' }, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
        p: editProfile
          ? { xs: 'max(16px, env(safe-area-inset-top)) 16px', sm: '16px 20px' }
          : { xs: 'max(32px, env(safe-area-inset-top) + 12px) 16px 32px', sm: '32px 20px 32px' },
        textAlign: 'center',
        flexShrink: 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: editProfile ? 0 : 2 }}>
          <IconButton onClick={() => { setEditProfile(null); navigate('/'); }} sx={glassButtonSx}>
            <ArrowForwardIcon sx={{ fontSize: 22 }} />
          </IconButton>
          <Typography sx={{ flex: 1, color: 'white', fontSize: 18, fontWeight: 700 }}>
            {editProfile ? t('editProfile') : t('profile')}
          </Typography>
          {!editProfile && (
            <IconButton onClick={openEditProfile} sx={glassButtonSx}>
              <EditIcon sx={{ fontSize: 22 }} />
            </IconButton>
          )}
        </Box>

        {/* Profile Avatar (View Mode) */}
        {!editProfile && (
          <>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: user.avatarColor || 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 1.5,
              border: '3px solid rgba(255,255,255,0.3)',
              fontSize: 32,
              color: 'white',
              fontWeight: 700
            }}>
              {user.avatarEmoji || user.name.charAt(0)}
            </Box>
            <Typography sx={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{user.name}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, mt: 0.5 }}>{user.email}</Typography>
          </>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, pt: editProfile ? 2 : 2, pb: 'calc(24px + env(safe-area-inset-bottom))', mt: editProfile ? 0 : -3, WebkitOverflowScrolling: 'touch' }}>
        {editProfile ? (
          <Paper sx={{ borderRadius: '14px', p: 2.5 }}>
            {/* Avatar Preview */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
              <Box sx={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                bgcolor: editProfile.avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 38,
                color: 'white',
                fontWeight: 700,
                border: '3px solid',
                borderColor: 'divider',
                boxShadow: '0 6px 20px rgba(0,0,0,0.1)'
              }}>
                {editProfile.avatarEmoji || editProfile.name.charAt(0) || '?'}
              </Box>
            </Box>

            {/* Color Selection */}
            <Typography sx={{ ...labelSx, textAlign: 'center', mb: 1 }}>{t('color')}</Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 2.5 }}>
              {AVATAR_COLORS.map(c => (
                <Box
                  key={c}
                  onClick={() => setEditProfile({ ...editProfile, avatarColor: c })}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: c,
                    border: editProfile.avatarColor === c ? '3px solid' : '3px solid transparent',
                    borderColor: editProfile.avatarColor === c ? 'text.primary' : 'transparent',
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                    '&:hover': { transform: 'scale(1.1)' }
                  }}
                />
              ))}
            </Box>

            {/* Emoji Selection */}
            <Typography sx={{ ...labelSx, textAlign: 'center', mb: 1 }}>{t('icon')}</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center', mb: 2.5, flexWrap: 'wrap' }}>
              {AVATAR_EMOJIS.map(e => (
                <Box
                  key={e}
                  onClick={() => setEditProfile({ ...editProfile, avatarEmoji: e })}
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '10px',
                    border: editProfile.avatarEmoji === e ? '2px solid' : '1.5px solid',
                    borderColor: editProfile.avatarEmoji === e ? 'primary.main' : 'divider',
                    bgcolor: editProfile.avatarEmoji === e ? 'primary.light' : 'background.paper',
                    fontSize: 22,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                >
                  {e || <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>-</Typography>}
                </Box>
              ))}
            </Box>

            {/* Name Field */}
            <Box sx={{ mb: 2 }}>
              <Typography sx={labelSx}>{t('name')}</Typography>
              <TextField
                fullWidth
                size="small"
                value={editProfile.name}
                onChange={e => setEditProfile({ ...editProfile, name: e.target.value })}
                placeholder={t('name')}
              />
            </Box>

            {/* Email Field */}
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={labelSx}>{t('email')}</Typography>
              <TextField
                fullWidth
                size="small"
                value={editProfile.email}
                onChange={e => setEditProfile({ ...editProfile, email: e.target.value })}
                placeholder="example@email.com"
              />
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                onClick={() => setEditProfile(null)}
                sx={{ flex: 1 }}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="contained"
                fullWidth
                sx={{ flex: 2 }}
                onClick={handleSave}
              >
                {t('saveChanges')}
              </Button>
            </Box>
          </Paper>
        ) : (
          <>
            {/* User Info Card */}
            <Paper sx={{ borderRadius: '14px', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box component="span" sx={{ fontSize: 20 }}>👤</Box>
                <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 14, color: 'text.primary' }}>{t('name')}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{user.name}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75 }}>
                <Box component="span" sx={{ fontSize: 20 }}>✉️</Box>
                <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 14, color: 'text.primary' }}>{t('email')}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{user.email}</Typography>
              </Box>
            </Paper>

            {/* Logout Button */}
            <Button
              fullWidth
              onClick={() => setConfirmLogout(true)}
              startIcon={<LogoutIcon sx={{ fontSize: 20 }} />}
              sx={{
                mt: 2.5,
                py: 1.5,
                borderRadius: '12px',
                bgcolor: '#FEE2E2',
                color: '#DC2626',
                fontWeight: 600,
                fontSize: 15,
                gap: 1,
                '&:hover': { bgcolor: '#FECACA' }
              }}
            >
              {t('logout')}
            </Button>
          </>
        )}
      </Box>

      {/* Confirm Logout Modal */}
      {confirmLogout && (
        <ConfirmModal
          title={t('logout')}
          message={t('logoutConfirm')}
          confirmText={t('logout')}
          onConfirm={handleLogout}
          onCancel={() => setConfirmLogout(false)}
        />
      )}
    </Box>
  );
}
