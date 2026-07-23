import { memo, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
import type { List } from '../../../../global/types';
import { useSettings } from '../../../../global/context/SettingsContext';

// ===== שינוי סיסמה - מעל כפתור שמירה, נפתח בלחיצה =====
interface ChangePasswordSectionProps {
  list: List;
  onChangePassword: (password: string) => void | Promise<void>;
}

export const ChangePasswordSection = memo(({ list, onChangePassword }: ChangePasswordSectionProps) => {
  const { t } = useSettings();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  return (
    <>
      <Box
        onClick={() => setShowChangePassword(!showChangePassword)}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          py: 1.25, px: 1.5,
          cursor: 'pointer',
          mb: showChangePassword ? 1 : 2,
          borderRadius: '10px',
          bgcolor: showChangePassword ? 'rgba(20,184,166,0.08)' : 'action.hover',
          border: '1px solid',
          borderColor: showChangePassword ? 'rgba(20,184,166,0.25)' : 'transparent',
          transition: 'background 0.15s ease, border-color 0.15s ease, opacity 0.1s',
          '&:active': { opacity: 0.75 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{ fontSize: 14 }}>🔑</Typography>
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: 'text.primary' }}>
            שנה סיסמה
          </Typography>
        </Box>
        <Typography sx={{
          fontSize: 13,
          color: 'primary.main',
          fontWeight: 700,
          transition: 'transform 0.25s ease',
          transform: showChangePassword ? 'rotate(180deg)' : 'rotate(0deg)',
          lineHeight: 1,
        }}>
          ▼
        </Typography>
      </Box>
      {showChangePassword && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              value={newPassword}
              onChange={e => setNewPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1234"
              size="small"
              fullWidth
              inputProps={{ inputMode: 'numeric', maxLength: 4, style: { textAlign: 'center', fontSize: 18, fontWeight: 700, letterSpacing: 6 } }}
            />
            <Button
              variant="outlined"
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
              sx={{ minWidth: 80, fontSize: 13, fontWeight: 600 }}
            >
              {savingPassword ? <CircularProgress size={18} /> : t('save')}
            </Button>
          </Box>
        </Box>
      )}
    </>
  );
});

ChangePasswordSection.displayName = 'ChangePasswordSection';
