import { memo, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Collapse, Paper } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useSettings } from '../../../../global/context/SettingsContext';
import { settingsRowSx, rowLabelSx, rowHintSx, expandedAreaSx, pinFieldSx } from './listSettingsCardSx';

interface ConvertToGroupSectionProps {
  onConvertToGroup: (password: string) => void | Promise<void>;
}

export const ConvertToGroupSection = memo(({ onConvertToGroup }: ConvertToGroupSectionProps) => {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [converting, setConverting] = useState(false);

  return (
    <Paper elevation={0} sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2.5, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={settingsRowSx} onClick={() => setOpen(v => !v)}>
        <Box component="span" sx={{ fontSize: 22 }}>👥</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={rowLabelSx}>{t('convertToGroup')}</Typography>
          <Typography sx={rowHintSx}>{t('convertToGroupHint')}</Typography>
        </Box>
        <ExpandMoreRoundedIcon sx={{
          color: 'text.disabled', flexShrink: 0,
          transition: 'transform 0.25s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </Box>

      <Collapse in={open} unmountOnExit>
        <Box sx={expandedAreaSx}>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1.5, lineHeight: 1.55 }}>
            {t('convertToGroupExplain')}
          </Typography>

          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.25 }}>
            {t('setGroupPassword')}
          </Typography>

          <TextField
            fullWidth
            value={password}
            onChange={e => setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="• • • •"
            size="small"
            inputProps={{ inputMode: 'numeric', maxLength: 4, style: { textAlign: 'center', fontSize: 22, fontWeight: 700, letterSpacing: 8 } }}
            sx={{ ...pinFieldSx, mb: 1.5 }}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => { setOpen(false); setPassword(''); }}
              disabled={converting}
              sx={{ flex: 1, fontSize: 13, borderRadius: '12px', height: 40 }}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={password.length !== 4 || converting}
              onClick={async () => {
                setConverting(true);
                try {
                  await onConvertToGroup(password);
                } finally {
                  setConverting(false);
                }
              }}
              sx={{ flex: 1, fontSize: 13, fontWeight: 700, borderRadius: '12px', height: 40 }}
            >
              {converting ? <CircularProgress size={17} sx={{ color: 'white' }} /> : t('convertToGroup')}
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
});

ConvertToGroupSection.displayName = 'ConvertToGroupSection';
