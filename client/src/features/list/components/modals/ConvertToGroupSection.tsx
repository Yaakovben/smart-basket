import { memo, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Collapse, Paper } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useSettings } from '../../../../global/context/SettingsContext';
import { settingsRowSx, rowLabelSx, rowHintSx, expandedFieldRowSx } from './listSettingsCardSx';

// ===== המרת רשימה פרטית לקבוצה: כרטיס פתיחה + שלב הגדרת סיסמה =====
interface ConvertToGroupSectionProps {
  onConvertToGroup: (password: string) => void | Promise<void>;
}

export const ConvertToGroupSection = memo(({ onConvertToGroup }: ConvertToGroupSectionProps) => {
  const { t } = useSettings();
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const [convertPassword, setConvertPassword] = useState('');
  const [converting, setConverting] = useState(false);

  return (
    <Paper sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2.5 }}>
      <Box sx={settingsRowSx} onClick={() => setShowPasswordStep(!showPasswordStep)}>
        <Box component="span" sx={{ fontSize: 22 }}>👥</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={rowLabelSx}>{t('convertToGroup')}</Typography>
          <Typography sx={rowHintSx}>{t('convertToGroupHint')}</Typography>
        </Box>
        <ExpandMoreRoundedIcon sx={{
          color: 'text.disabled',
          flexShrink: 0,
          transition: 'transform 0.25s ease',
          transform: showPasswordStep ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </Box>
      <Collapse in={showPasswordStep} unmountOnExit>
        <Box sx={{ ...expandedFieldRowSx, flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
            {t('setGroupPassword')}
          </Typography>
          <TextField
            fullWidth
            autoFocus
            value={convertPassword}
            onChange={e => setConvertPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="1234"
            size="small"
            inputProps={{ inputMode: 'numeric', maxLength: 4, style: { textAlign: 'center', fontSize: 18, fontWeight: 700, letterSpacing: 4 } }}
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
    </Paper>
  );
});

ConvertToGroupSection.displayName = 'ConvertToGroupSection';
