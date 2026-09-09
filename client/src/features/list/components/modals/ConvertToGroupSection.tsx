import { memo, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Collapse } from '@mui/material';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import { useSettings } from '../../../../global/context/SettingsContext';
import { settingsCardSx, iconBadgeSx, pinFieldSx, cardInk } from './listSettingsCardSx';

// ===== המרת רשימה פרטית לקבוצה: כרטיס פתיחה + שלב הגדרת סיסמה =====
interface ConvertToGroupSectionProps {
  onConvertToGroup: (password: string) => void | Promise<void>;
}

export const ConvertToGroupSection = memo(({ onConvertToGroup }: ConvertToGroupSectionProps) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const [convertPassword, setConvertPassword] = useState('');
  const [converting, setConverting] = useState(false);

  return (
    <>
      <Box
        onClick={() => setShowPasswordStep(!showPasswordStep)}
        sx={{ ...settingsCardSx('accent', isDark), mb: showPasswordStep ? 1 : 0 }}
      >
        <Box sx={iconBadgeSx('accent', isDark)}>
          <GroupAddRoundedIcon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: cardInk('accent', isDark), lineHeight: 1.3 }}>
            {t('convertToGroup')}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3 }}>
            {t('convertToGroupHint')}
          </Typography>
        </Box>
      </Box>
      <Collapse in={showPasswordStep} unmountOnExit>
        <Box sx={{ mt: 1.25, mb: 1, px: 0.25 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: cardInk('accent', isDark), mb: 1 }}>
            {t('setGroupPassword')}
          </Typography>
          <TextField
            fullWidth
            autoFocus
            value={convertPassword}
            onChange={e => setConvertPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="• • • •"
            size="small"
            sx={{ ...pinFieldSx(isDark), mb: 1.5 }}
            inputProps={{ inputMode: 'numeric', maxLength: 4, style: { textAlign: 'center', fontSize: 20, fontWeight: 700, letterSpacing: 12 } }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => { setShowPasswordStep(false); setConvertPassword(''); }}
              disabled={converting}
              sx={{ flex: 1, fontSize: 13 }}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={convertPassword.length !== 4 || converting}
              onClick={async () => {
                setConverting(true);
                try {
                  await onConvertToGroup(convertPassword);
                } finally {
                  setConverting(false);
                }
              }}
              sx={{ flex: 1, fontSize: 13, fontWeight: 700 }}
            >
              {converting ? <CircularProgress size={18} sx={{ color: 'white' }} /> : t('convertToGroup')}
            </Button>
          </Box>
        </Box>
      </Collapse>
    </>
  );
});

ConvertToGroupSection.displayName = 'ConvertToGroupSection';
