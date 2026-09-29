import { memo, useState } from 'react';
import { Box, Typography, TextField, Collapse, Paper } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useSettings } from '../../../../global/context/SettingsContext';
import { settingsRowSx, rowLabelSx, rowHintSx, expandedAreaSx, pinFieldSx } from './listSettingsCardSx';

interface ConvertToGroupSectionProps {
  password: string;
  onPasswordChange: (password: string) => void;
}

// ההמרה מתבצעת בכפתור השמירה הראשי של המודאל, יחד עם שאר השינויים. קודם היו
// כאן גם "ביטול" ו"הפוך למשותפת", ועם "שמור שינויים" זה היה שלושה כפתורים.
// סגירת הקטע מבטלת את ההמרה (מנקה את הקוד).
export const ConvertToGroupSection = memo(({ password, onPasswordChange }: ConvertToGroupSectionProps) => {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const toggle = () => {
    if (open) onPasswordChange('');
    setOpen(v => !v);
  };

  return (
    <Paper elevation={0} sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2.5, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={settingsRowSx} onClick={toggle}>
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
            onChange={e => onPasswordChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="• • • •"
            size="small"
            inputProps={{ inputMode: 'numeric', maxLength: 4, 'aria-label': t('setGroupPassword'), style: { textAlign: 'center', fontSize: 22, fontWeight: 700, letterSpacing: 8 } }}
            sx={pinFieldSx}
          />
        </Box>
      </Collapse>
    </Paper>
  );
});

ConvertToGroupSection.displayName = 'ConvertToGroupSection';
