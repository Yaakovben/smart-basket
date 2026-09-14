import { memo, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Collapse, Paper } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import type { List } from '../../../../global/types';
import { useSettings } from '../../../../global/context/SettingsContext';
import { settingsRowSx, rowLabelSx, rowHintSx, accentBarSx } from './listSettingsCardSx';

// ===== שינוי סיסמה - מעל כפתור שמירה, נפתח בלחיצה =====
// אותה שורת-הגדרות בדיוק כמו במסך ההגדרות הראשי (SettingsComponent) -
// אמוג'י, טקסט, chevron - בתוך Paper מעוגל. שדה הקוד עצמו TextField רגיל
// לגמרי, בלי שום עיצוב "חכם" - ראו ההערה ב-listSettingsCardSx.ts.
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
    <Paper sx={{ ...accentBarSx('accent'), borderRadius: '16px', overflow: 'hidden', mt: 2.5, mb: 2 }}>
      <Box sx={settingsRowSx} onClick={() => setShowChangePassword(!showChangePassword)}>
        <Box component="span" sx={{ fontSize: 22 }}>🔑</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={rowLabelSx}>{t('changePassword')}</Typography>
          <Typography sx={rowHintSx}>{t('changePasswordHint')}</Typography>
        </Box>
        <ExpandMoreRoundedIcon sx={{
          color: 'text.disabled',
          flexShrink: 0,
          transition: 'transform 0.25s ease',
          transform: showChangePassword ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </Box>
      <Collapse in={showChangePassword} unmountOnExit>
        <Box sx={{
          px: 2, pb: 2, pt: 0.5,
          bgcolor: 'action.hover',
          borderTop: '1px solid',
          borderTopColor: 'divider',
        }}>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 500, mb: 1, mt: 1 }}>
            {t('newPasswordLabel')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              value={newPassword}
              onChange={e => setNewPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="• • • •"
              size="small"
              fullWidth
              inputProps={{ inputMode: 'numeric', maxLength: 4, style: { textAlign: 'center', fontSize: 20, fontWeight: 700, letterSpacing: 6 } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: 'background.paper',
                },
              }}
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
              sx={{ minWidth: 76, fontSize: 13, fontWeight: 700, borderRadius: '12px', height: 40, flexShrink: 0 }}
            >
              {savingPassword ? <CircularProgress size={18} sx={{ color: 'white' }} /> : t('save')}
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
});

ChangePasswordSection.displayName = 'ChangePasswordSection';
