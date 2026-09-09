import { memo, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Collapse } from '@mui/material';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import type { List } from '../../../../global/types';
import { useSettings } from '../../../../global/context/SettingsContext';
import { settingsRowSx, iconBadgeSx, pinFieldSx } from './listSettingsCardSx';

// ===== שינוי סיסמה - מעל כפתור שמירה, נפתח בלחיצה =====
interface ChangePasswordSectionProps {
  list: List;
  onChangePassword: (password: string) => void | Promise<void>;
}

export const ChangePasswordSection = memo(({ list, onChangePassword }: ChangePasswordSectionProps) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  return (
    <>
      <Box
        onClick={() => setShowChangePassword(!showChangePassword)}
        sx={{ ...settingsRowSx(), mt: 2.5, mb: showChangePassword ? 1 : 0 }}
      >
        <Box sx={iconBadgeSx('accent', isDark)}>
          <KeyRoundedIcon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
            {t('changePassword')}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.3 }}>
            {t('changePasswordHint')}
          </Typography>
        </Box>
        <ExpandMoreRoundedIcon sx={{
          color: 'text.secondary',
          flexShrink: 0,
          transition: 'transform 0.25s ease',
          transform: showChangePassword ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </Box>
      <Collapse in={showChangePassword} unmountOnExit>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, mt: 1.25, px: 0.25 }}>
          <TextField
            value={newPassword}
            onChange={e => setNewPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="• • • •"
            size="small"
            fullWidth
            autoFocus
            sx={pinFieldSx(isDark)}
            inputProps={{ inputMode: 'numeric', maxLength: 4, style: { textAlign: 'center', fontSize: 20, fontWeight: 700, letterSpacing: 10 } }}
          />
          <Button
            variant="contained"
            disabled={newPassword.length !== 4 || newPassword === (list.password || '') || savingPassword}
            onClick={async () => {
              setSavingPassword(true);
              try {
                await onChangePassword(newPassword);
                setNewPassword('');
                setShowChangePassword(false);
              } finally {
                setSavingPassword(false);
              }
            }}
            sx={{ minWidth: 80, fontSize: 13, fontWeight: 700 }}
          >
            {savingPassword ? <CircularProgress size={18} sx={{ color: 'white' }} /> : t('save')}
          </Button>
        </Box>
      </Collapse>
    </>
  );
});

ChangePasswordSection.displayName = 'ChangePasswordSection';
