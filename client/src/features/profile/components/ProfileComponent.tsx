import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Button, Paper, CircularProgress } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import type { User } from '../../../global/types';
import { ConfirmModal, ClearableTextField, AvatarRing } from '../../../global/components';
import { getIconGradient } from '../../../global/theme/iconArt';
import { formatDateShort } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import { useReliableTap } from '../../../global/hooks';
import { useProfile } from '../hooks/useProfile';
import { AVATAR_COLORS, AVATAR_EMOJIS } from '../types/profile-types';
import {
  glassButtonSx, labelSx, headerSx, contentAreaSx,
  colorSwatchSx, emojiSwatchSx, infoCardSx, infoRowSx, lastInfoRowSx,
  infoIconSx, infoTextSx, logoutRowSx,
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

  const backTap = useReliableTap(() => { closeEdit(); navigate('/'); });
  const editTap = useReliableTap(openEditProfile);

  return (
    <Box sx={{ height: { xs: '100dvh', sm: '100vh' }, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={headerSx(!!editProfile, isDark)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: editProfile ? 0 : 2 }}>
          {/* useReliableTap: onPointerUp אמין למגע/עכבר (אותו דפוס כמו
              HomeHeader), עם onClick כ-fallback כדי שהפעלה במקלדת
              (Enter/Space) לא תישאר מתה - pointerup לא יורה בהפעלה כזו. */}
          <IconButton
            {...backTap}
            sx={{ ...glassButtonSx, touchAction: 'manipulation' }}
          >
            <ArrowForwardIcon sx={{ fontSize: 22 }} />
          </IconButton>
          <Typography sx={{ flex: 1, color: 'white', fontSize: 18, fontWeight: 700 }}>
            {editProfile ? t('editProfile') : t('profile')}
          </Typography>
          {!editProfile && (
            <IconButton
              {...editTap}
              sx={{ ...glassButtonSx, touchAction: 'manipulation' }}
            >
              <EditIcon sx={{ fontSize: 22 }} />
            </IconButton>
          )}
        </Box>

        {/* Profile Avatar (View Mode) - הדר נשאר קליל (אווטאר+שם בלבד),
            אימייל/תאריך הצטרפות עברו לכרטיס מידע בתוכן למטה, אותה שפה
            צורנית כמו כרטיסי ה-Settings, במקום להצטופף כטקסט על הגרדיאנט. */}
        {!editProfile && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <AvatarRing emoji={user.avatarEmoji} initials={user.name.charAt(0)} color={user.avatarColor} seedId={user.id || user.name} size={80} />
            <Typography sx={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{user.name}</Typography>
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box sx={contentAreaSx(!!editProfile)}>
        {editProfile ? (
          <Paper sx={{ borderRadius: '14px', p: 2.5 }}>
            {/* Avatar Preview */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
              <AvatarRing emoji={editProfile.avatarEmoji} initials={editProfile.name.charAt(0) || '?'} color={editProfile.avatarColor} seedId={user.id || user.name} size={88} />
            </Box>

            {/* Color Selection */}
            <Typography sx={{ ...labelSx, textAlign: 'center', mb: 1 }}>{t('color')}</Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 2.5 }}>
              {AVATAR_COLORS.map(c => (
                <Box
                  key={c}
                  onClick={() => updateEditField('avatarColor', c)}
                  sx={{ ...colorSwatchSx(c, editProfile.avatarColor === c), background: getIconGradient(c) }}
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
            {/* Account Info Card */}
            <Paper sx={infoCardSx}>
              <Box sx={infoRowSx}>
                <Box sx={infoIconSx}>📧</Box>
                <Typography sx={infoTextSx}>{user.email}</Typography>
              </Box>
              <Box sx={lastInfoRowSx}>
                <Box sx={infoIconSx}>📅</Box>
                <Typography sx={infoTextSx}>
                  {user.createdAt
                    ? t('memberSince').replace('{date}', formatDateShort(user.createdAt, settings.language))
                    : '—'}
                </Typography>
              </Box>
            </Paper>

            {/* Logout Row - שורת-סכנה כמו ב-Settings, לא כפתור גדול נפרד */}
            <Paper sx={{ ...infoCardSx, mt: 2 }}>
              <Box sx={logoutRowSx(isDark)} onClick={() => setConfirmLogout(true)}>
                <Box sx={infoIconSx}><LogoutIcon sx={{ fontSize: 17, color: 'inherit' }} /></Box>
                <Typography sx={{ ...infoTextSx, color: 'inherit', fontWeight: 600 }}>{t('logout')}</Typography>
              </Box>
            </Paper>
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
