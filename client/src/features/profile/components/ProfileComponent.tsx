import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Button, Paper, CircularProgress } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import type { User } from '../../../global/types';
import { ConfirmModal, ClearableTextField } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { useProfile } from '../hooks/useProfile';
import { AVATAR_COLORS, AVATAR_EMOJIS } from '../types/profile-types';
import {
  glassButtonSx, labelSx, headerSx, viewAvatarCircleSx, contentAreaSx,
  editAvatarPreviewSx, colorSwatchSx, emojiSwatchSx, logoutButtonSx,
} from '../styles/ProfileComponent.styles';

// ===== ממשק Props =====
interface ProfilePageProps {
  user: User;
  onUpdateUser: (user: Partial<User>) => Promise<void>;
  onLogout: () => void;
}

export const ProfileComponent = ({ user, onUpdateUser, onLogout }: ProfilePageProps) => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';

  const {
    editProfile, confirmLogout, hasChanges, savingProfile,
    setConfirmLogout,
    openEditProfile, handleSave, handleLogout, updateEditField, closeEdit
  } = useProfile({ user, onUpdateUser, onLogout });

  return (
    <Box sx={{ height: { xs: '100dvh', sm: '100vh' }, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={headerSx(!!editProfile, isDark)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: editProfile ? 0 : 2 }}>
          {/* onPointerUp + blur - אותו דפוס בדיוק כמו HomeHeader (glassButtonSx
              IconButton בהדר צבעוני) שם onClick רגיל התגלה כלא אמין על חלק
              מהמכשירים. */}
          <IconButton
            onPointerUp={(e) => { (e.currentTarget as HTMLElement).blur(); closeEdit(); navigate('/'); }}
            sx={{ ...glassButtonSx, touchAction: 'manipulation' }}
          >
            <ArrowForwardIcon sx={{ fontSize: 22 }} />
          </IconButton>
          <Typography sx={{ flex: 1, color: 'white', fontSize: 18, fontWeight: 700 }}>
            {editProfile ? t('editProfile') : t('profile')}
          </Typography>
          {!editProfile && (
            <IconButton
              onPointerUp={(e) => { (e.currentTarget as HTMLElement).blur(); openEditProfile(); }}
              sx={{ ...glassButtonSx, touchAction: 'manipulation' }}
            >
              <EditIcon sx={{ fontSize: 22 }} />
            </IconButton>
          )}
        </Box>

        {/* Profile Avatar (View Mode) */}
        {!editProfile && (
          <>
            <Box sx={viewAvatarCircleSx(user.avatarColor)}>
              <Box component="span" sx={{ fontSize: 32, lineHeight: 1, fontWeight: 700, mt: '-2px' }}>
                {user.avatarEmoji || user.name.charAt(0)}
              </Box>
            </Box>
            <Typography sx={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{user.name}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, mt: 0.5 }}>{user.email}</Typography>
          </>
        )}
      </Box>

      {/* Content */}
      <Box sx={contentAreaSx(!!editProfile)}>
        {editProfile ? (
          <Paper sx={{ borderRadius: '14px', p: 2.5 }}>
            {/* Avatar Preview */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
              <Box sx={editAvatarPreviewSx(editProfile.avatarColor)}>
                <Box component="span" sx={{ fontSize: 38, lineHeight: 1, fontWeight: 700, mt: '-2px' }}>
                  {editProfile.avatarEmoji || editProfile.name.charAt(0) || '?'}
                </Box>
              </Box>
            </Box>

            {/* Color Selection */}
            <Typography sx={{ ...labelSx, textAlign: 'center', mb: 1 }}>{t('color')}</Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 2.5 }}>
              {AVATAR_COLORS.map(c => (
                <Box
                  key={c}
                  onClick={() => updateEditField('avatarColor', c)}
                  sx={colorSwatchSx(c, editProfile.avatarColor === c)}
                />
              ))}
            </Box>

            {/* Emoji Selection */}
            <Typography sx={{ ...labelSx, textAlign: 'center', mb: 1 }}>{t('icon')}</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center', mb: 2.5, flexWrap: 'wrap' }}>
              {AVATAR_EMOJIS.map(e => (
                <Box
                  key={e}
                  onClick={() => updateEditField('avatarEmoji', e)}
                  sx={emojiSwatchSx(editProfile.avatarEmoji === e)}
                >
                  {e || <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>-</Typography>}
                </Box>
              ))}
            </Box>

            {/* Name Field */}
            <Box sx={{ mb: 2 }}>
              <Typography sx={labelSx}>{t('name')}</Typography>
              <ClearableTextField
                fullWidth
                size="small"
                value={editProfile.name}
                onChange={e => updateEditField('name', e.target.value)}
                onClear={() => updateEditField('name', '')}
                placeholder={t('name')}
              />
            </Box>

            {/* Email Field */}
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={labelSx}>{t('email')}</Typography>
              <ClearableTextField
                fullWidth
                size="small"
                value={editProfile.email}
                onChange={e => updateEditField('email', e.target.value)}
                onClear={() => updateEditField('email', '')}
                placeholder="example@email.com"
              />
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button variant="outlined" onClick={closeEdit} sx={{ flex: 1 }}>
                {t('cancel')}
              </Button>
              <Button variant="contained" fullWidth sx={{ flex: 2 }} onClick={handleSave} disabled={!hasChanges || savingProfile}>
                {savingProfile ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('saveChanges')}
              </Button>
            </Box>
          </Paper>
        ) : (
          <>
            {/* Logout Button */}
            <Button
              fullWidth
              onClick={() => setConfirmLogout(true)}
              startIcon={<LogoutIcon sx={{ fontSize: 20 }} />}
              sx={logoutButtonSx(isDark)}
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
