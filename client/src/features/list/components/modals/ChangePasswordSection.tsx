import { memo, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Collapse, Paper } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import type { List } from '../../../../global/types';
import { useSettings } from '../../../../global/context/SettingsContext';
import { settingsRowSx, rowLabelSx, rowHintSx, expandedFieldRowSx, accentBarSx } from './listSettingsCardSx';

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
        <Box sx={expandedFieldRowSx}>
          <TextField
            value={newPassword}
            onChange={e => setNewPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="1234"
            size="small"
            fullWidth
            autoFocus
            inputProps={{ inputMode: 'numeric', maxLength: 4, style: { textAlign: 'center', fontSize: 18, fontWeight: 700, letterSpacing: 4 } }}
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
            sx={{ minWidth: 76, fontSize: 13, fontWeight: 700 }}
          >
            {savingPassword ? <CircularProgress size={18} sx={{ color: 'white' }} /> : t('save')}
          </Button>
        </Box>
      </Collapse>
    </Paper>
  );
});

ChangePasswordSection.displayName = 'ChangePasswordSection';
