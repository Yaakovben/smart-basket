import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, TextField, Button, Paper } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import type { User } from '../../../global/types';
import { ConfirmModal } from '../../../global/components';

interface ProfilePageProps {
  user: User;
  onUpdateUser: (user: Partial<User>) => void;
  onLogout: () => void;
}

export const ProfileComponent = ({ user, onUpdateUser, onLogout }: ProfilePageProps) => {
  const navigate = useNavigate();
  const [editProfile, setEditProfile] = useState<{ name: string; email: string; avatarColor: string; avatarEmoji: string } | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <Box sx={{ minHeight: { xs: '100dvh', sm: '100vh' }, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto' }}>
      <Box sx={{
        background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
        p: editProfile
          ? { xs: 'max(16px, env(safe-area-inset-top)) 16px', sm: '16px 20px' }
          : { xs: 'max(32px, env(safe-area-inset-top) + 12px) 16px 28px', sm: '32px 20px 28px' },
        textAlign: 'center',
        flexShrink: 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.25, sm: 1.5 }, mb: editProfile ? 0 : { xs: 2, sm: 2.5 } }}>
          <IconButton
            onClick={() => { setEditProfile(null); navigate('/'); }}
            sx={{ color: 'white', width: { xs: 38, sm: 42 }, height: { xs: 38, sm: 42 } }}
          >
            <ArrowForwardIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
          <Typography sx={{ flex: 1, color: 'white', fontSize: { xs: 18, sm: 20 }, fontWeight: 700 }}>
            {editProfile ? 'עריכת פרופיל' : 'פרופיל'}
          </Typography>
          {!editProfile && (
            <IconButton
              onClick={() => setEditProfile({ name: user.name, email: user.email, avatarColor: user.avatarColor || '#14B8A6', avatarEmoji: user.avatarEmoji || '' })}
              sx={{ color: 'white', width: { xs: 38, sm: 42 }, height: { xs: 38, sm: 42 } }}
            >
              <EditIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
            </IconButton>
          )}
        </Box>
        {!editProfile && (
          <>
            <Box sx={{
              width: { xs: 70, sm: 80 },
              height: { xs: 70, sm: 80 },
              borderRadius: '50%',
              bgcolor: user.avatarColor || 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: { xs: 1.25, sm: 1.5 },
              border: '3px solid rgba(255,255,255,0.3)',
              fontSize: { xs: 28, sm: 32 },
              color: 'white',
              fontWeight: 700
            }}>
              {user.avatarEmoji || user.name.charAt(0)}
            </Box>
            <Typography sx={{ color: 'white', fontSize: { xs: 16, sm: 18 }, fontWeight: 700 }}>{user.name}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: { xs: 12, sm: 13 }, mt: 0.25 }}>{user.email}</Typography>
          </>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 2.5 }, pt: editProfile ? 0 : { xs: 2, sm: 2.5 }, pb: 'calc(24px + env(safe-area-inset-bottom))', mt: editProfile ? 0 : -2.5, WebkitOverflowScrolling: 'touch' }}>
        {editProfile ? (
          <Paper sx={{ borderRadius: { xs: '14px', sm: '16px' }, p: { xs: 2, sm: 2.5 }, mt: { xs: 1.5, sm: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 2, sm: 2.5 } }}>
              <Box sx={{
                width: { xs: 60, sm: 70 },
                height: { xs: 60, sm: 70 },
                borderRadius: '50%',
                bgcolor: editProfile.avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: { xs: 24, sm: 28 },
                color: 'white',
                fontWeight: 700,
                border: '3px solid #E5E7EB'
              }}>
                {editProfile.avatarEmoji || editProfile.name.charAt(0) || '?'}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, justifyContent: 'center', mb: { xs: 1.5, sm: 2 } }}>
              {['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981'].map(c => (
                <Box
                  key={c}
                  onClick={() => setEditProfile({ ...editProfile, avatarColor: c })}
                  sx={{
                    width: { xs: 32, sm: 36 },
                    height: { xs: 32, sm: 36 },
                    borderRadius: '50%',
                    bgcolor: c,
                    border: editProfile.avatarColor === c ? '3px solid #111' : '3px solid transparent',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 0.75 }, justifyContent: 'center', mb: { xs: 2, sm: 2.5 }, flexWrap: 'wrap' }}>
              {['', '😊', '😎', '🦁', '🐻', '🦊', '🌟', '⚡'].map(e => (
                <Box
                  key={e}
                  onClick={() => setEditProfile({ ...editProfile, avatarEmoji: e })}
                  sx={{
                    width: { xs: 36, sm: 40 },
                    height: { xs: 36, sm: 40 },
                    borderRadius: { xs: '8px', sm: '10px' },
                    border: editProfile.avatarEmoji === e ? '2px solid #14B8A6' : '1.5px solid #E5E7EB',
                    bgcolor: editProfile.avatarEmoji === e ? '#F0FDFA' : 'white',
                    fontSize: { xs: 18, sm: 20 },
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {e || <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: '#9CA3AF' }}>ללא</Typography>}
                </Box>
              ))}
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>שם</Typography>
              <TextField fullWidth value={editProfile.name} onChange={e => setEditProfile({ ...editProfile, name: e.target.value })} />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>אימייל</Typography>
              <TextField fullWidth value={editProfile.email} onChange={e => setEditProfile({ ...editProfile, email: e.target.value })} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.25, mt: 2.5 }}>
              <Button variant="outlined" onClick={() => setEditProfile(null)} sx={{ borderColor: '#E5E7EB', borderWidth: 2, color: 'text.primary', '&:hover': { borderColor: '#E5E7EB', borderWidth: 2, bgcolor: '#F9FAFB' } }}>
                ביטול
              </Button>
              <Button variant="contained" fullWidth onClick={() => { onUpdateUser(editProfile); setEditProfile(null); }}>
                שמור
              </Button>
            </Box>
          </Paper>
        ) : (
          <>
            <Paper sx={{ borderRadius: { xs: '14px', sm: '16px' }, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.25, sm: 1.5 }, p: { xs: 1.5, sm: 2 }, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box component="span" sx={{ fontSize: { xs: 18, sm: 20 } }}>👤</Box>
                <Typography sx={{ flex: 1, fontWeight: 500, fontSize: { xs: 14, sm: 15 } }}>שם</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: { xs: 13, sm: 14 } }}>{user.name}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.25, sm: 1.5 }, p: { xs: 1.5, sm: 2 } }}>
                <Box component="span" sx={{ fontSize: { xs: 18, sm: 20 } }}>✉️</Box>
                <Typography sx={{ flex: 1, fontWeight: 500, fontSize: { xs: 14, sm: 15 } }}>אימייל</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: { xs: 13, sm: 14 } }}>{user.email}</Typography>
              </Box>
            </Paper>

            <Button
              fullWidth
              onClick={() => setConfirmLogout(true)}
              sx={{
                mt: { xs: 2.5, sm: 3 },
                py: { xs: 1.75, sm: 2 },
                borderRadius: { xs: '10px', sm: '12px' },
                bgcolor: '#FEE2E2',
                color: '#DC2626',
                fontWeight: 600,
                fontSize: { xs: 14, sm: 15 },
                '&:hover': { bgcolor: '#FECACA' }
              }}
            >
              התנתק
            </Button>
          </>
        )}
      </Box>

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
