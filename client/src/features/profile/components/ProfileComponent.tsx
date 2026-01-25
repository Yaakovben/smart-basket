import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, TextField, Button, Paper } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import type { User } from '../../../global/types';
import { ConfirmModal } from '../../../global/components';
import { SIZES } from '../../../global/constants';

interface ProfilePageProps {
  user: User;
  onUpdateUser: (user: Partial<User>) => void;
  onLogout: () => void;
}

const AVATAR_COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981'];
const AVATAR_EMOJIS = ['', '😊', '😎', '🦁', '🐻', '🦊', '🌟', '⚡'];

export const ProfileComponent = ({ user, onUpdateUser, onLogout }: ProfilePageProps) => {
  const navigate = useNavigate();
  const [editProfile, setEditProfile] = useState<{ name: string; email: string; avatarColor: string; avatarEmoji: string } | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const openEditProfile = () => {
    setEditProfile({
      name: user.name,
      email: user.email,
      avatarColor: user.avatarColor || '#14B8A6',
      avatarEmoji: user.avatarEmoji || ''
    });
  };

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: editProfile ? 0 : 2.5 }}>
          <IconButton
            onClick={() => { setEditProfile(null); navigate('/'); }}
            sx={{
              color: 'white',
              width: SIZES.iconButton.md.width,
              height: SIZES.iconButton.md.height,
              bgcolor: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
            }}
          >
            <ArrowForwardIcon sx={{ fontSize: SIZES.icon.md }} />
          </IconButton>
          <Typography sx={{ flex: 1, color: 'white', fontSize: SIZES.text.xl, fontWeight: 700 }}>
            {editProfile ? 'עריכת פרופיל' : 'פרופיל'}
          </Typography>
          {!editProfile && (
            <IconButton
              onClick={openEditProfile}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                width: SIZES.iconButton.md.width,
                height: SIZES.iconButton.md.height,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
              }}
            >
              <EditIcon sx={{ fontSize: SIZES.icon.md, color: 'white' }} />
            </IconButton>
          )}
        </Box>

        {/* Profile Avatar (View Mode) */}
        {!editProfile && (
          <>
            <Box sx={{
              width: SIZES.avatar.lg.width,
              height: SIZES.avatar.lg.height,
              borderRadius: '50%',
              bgcolor: user.avatarColor || 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 1.5,
              border: '3px solid rgba(255,255,255,0.3)',
              fontSize: SIZES.avatar.lg.fontSize,
              color: 'white',
              fontWeight: 700
            }}>
              {user.avatarEmoji || user.name.charAt(0)}
            </Box>
            <Typography sx={{ color: 'white', fontSize: SIZES.text.xxl, fontWeight: 700 }}>{user.name}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: SIZES.text.md, mt: 0.5 }}>{user.email}</Typography>
          </>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 2.5 }, pt: editProfile ? 2 : { xs: 2, sm: 2.5 }, pb: 'calc(24px + env(safe-area-inset-bottom))', mt: editProfile ? 0 : -3, WebkitOverflowScrolling: 'touch' }}>
        {editProfile ? (
          <Paper sx={{ borderRadius: SIZES.radius.lg, p: { xs: 2.5, sm: 3 } }}>
            {/* Avatar Preview */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Box sx={{
                width: SIZES.avatar.xl.width,
                height: SIZES.avatar.xl.height,
                borderRadius: '50%',
                bgcolor: editProfile.avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: SIZES.avatar.xl.fontSize,
                color: 'white',
                fontWeight: 700,
                border: '4px solid #E5E7EB',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
              }}>
                {editProfile.avatarEmoji || editProfile.name.charAt(0) || '?'}
              </Box>
            </Box>

            {/* Color Selection */}
            <Typography sx={{ fontSize: SIZES.text.sm, fontWeight: 600, color: 'text.secondary', mb: 1.5, textAlign: 'center' }}>
              צבע
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mb: 3 }}>
              {AVATAR_COLORS.map(c => (
                <Box
                  key={c}
                  onClick={() => setEditProfile({ ...editProfile, avatarColor: c })}
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: c,
                    border: editProfile.avatarColor === c ? '3px solid #111' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'scale(1.1)' }
                  }}
                />
              ))}
            </Box>

            {/* Emoji Selection */}
            <Typography sx={{ fontSize: SIZES.text.sm, fontWeight: 600, color: 'text.secondary', mb: 1.5, textAlign: 'center' }}>
              אימוג׳י
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3, flexWrap: 'wrap' }}>
              {AVATAR_EMOJIS.map(e => (
                <Box
                  key={e}
                  onClick={() => setEditProfile({ ...editProfile, avatarEmoji: e })}
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: SIZES.radius.md,
                    border: editProfile.avatarEmoji === e ? '2px solid #14B8A6' : '1.5px solid #E5E7EB',
                    bgcolor: editProfile.avatarEmoji === e ? '#F0FDFA' : 'white',
                    fontSize: SIZES.emoji.lg,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: '#14B8A6' }
                  }}
                >
                  {e || <Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>ללא</Typography>}
                </Box>
              ))}
            </Box>

            {/* Name Field */}
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: SIZES.text.sm, fontWeight: 600, color: 'text.secondary', mb: 1 }}>שם</Typography>
              <TextField
                fullWidth
                value={editProfile.name}
                onChange={e => setEditProfile({ ...editProfile, name: e.target.value })}
                placeholder="הכנס שם"
              />
            </Box>

            {/* Email Field */}
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: SIZES.text.sm, fontWeight: 600, color: 'text.secondary', mb: 1 }}>אימייל</Typography>
              <TextField
                fullWidth
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
                sx={{
                  flex: 1,
                  borderColor: '#E5E7EB',
                  borderWidth: 2,
                  color: 'text.primary',
                  '&:hover': { borderColor: '#E5E7EB', borderWidth: 2, bgcolor: '#F9FAFB' }
                }}
              >
                ביטול
              </Button>
              <Button
                variant="contained"
                fullWidth
                sx={{ flex: 2 }}
                onClick={() => { onUpdateUser(editProfile); setEditProfile(null); }}
              >
                שמור שינויים
              </Button>
            </Box>
          </Paper>
        ) : (
          <>
            {/* User Info Card */}
            <Paper sx={{ borderRadius: SIZES.radius.lg, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box component="span" sx={{ fontSize: SIZES.emoji.md }}>👤</Box>
                <Typography sx={{ flex: 1, fontWeight: 500, fontSize: SIZES.text.md }}>שם</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: SIZES.text.sm }}>{user.name}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
                <Box component="span" sx={{ fontSize: SIZES.emoji.md }}>✉️</Box>
                <Typography sx={{ flex: 1, fontWeight: 500, fontSize: SIZES.text.md }}>אימייל</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: SIZES.text.sm }}>{user.email}</Typography>
              </Box>
            </Paper>

            {/* Logout Button */}
            <Button
              fullWidth
              onClick={() => setConfirmLogout(true)}
              sx={{
                mt: 3,
                py: 2,
                borderRadius: SIZES.radius.md,
                bgcolor: '#FEE2E2',
                color: '#DC2626',
                fontWeight: 600,
                fontSize: SIZES.text.md,
                '&:hover': { bgcolor: '#FECACA' }
              }}
            >
              התנתק
            </Button>
          </>
        )}
      </Box>

      {/* Confirm Logout Modal */}
      {confirmLogout && (
        <ConfirmModal
          title="התנתקות"
          message="להתנתק מהחשבון?"
          confirmText="התנתק"
          onConfirm={() => { onLogout(); navigate('/login'); }}
          onCancel={() => setConfirmLogout(false)}
        />
      )}
    </Box>
  );
}
