import { memo, useRef, useState } from 'react';
import { Box, Typography, TextField, Collapse, Paper } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import { useSettings } from '../../../../global/context/SettingsContext';
import { focusWithKeyboard } from '../../../../global/helpers/focusWithKeyboard';
import {
  settingsRowSx, rowLabelSx, rowHintSx, settingsCardSx, settingsIconBoxSx, accentPinFieldSx, accentExpandedAreaSx, SETTINGS_ACCENTS,
} from './listSettingsCardSx';

const ACCENT = SETTINGS_ACCENTS.password;

interface ChangePasswordSectionProps {
  value: string;
  onChange: (password: string) => void;
}

// הקוד החדש נשמר יחד עם שאר השינויים בכפתור "שמור שינויים" של המודאל.
// כפתור שמירה נפרד כאן בלבל: שני כפתורי שמירה באותו מסך.
export const ChangePasswordSection = memo(({ value, onChange }: ChangePasswordSectionProps) => {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // פתיחת הקטע פותחת מיד את המקלדת על שדה הקוד, והשדה נגלל מעליה.
  // סגירת הקטע מנקה את מה שהוקלד.
  const toggle = () => {
    if (open) {
      onChange('');
      setOpen(false);
      return;
    }
    setOpen(true);
    focusWithKeyboard(paperRef.current, () => inputRef.current);
  };

  return (
    <Paper ref={paperRef} elevation={0} sx={settingsCardSx(ACCENT, open, 2)}>
      <Box sx={settingsRowSx} onClick={toggle}>
        <Box component="span" sx={settingsIconBoxSx(ACCENT)}><KeyRoundedIcon sx={{ fontSize: 21, color: ACCENT }} /></Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={rowLabelSx}>{t('changePassword')}</Typography>
          <Typography sx={rowHintSx}>{t('changePasswordHint')}</Typography>
        </Box>
        <ExpandMoreRoundedIcon sx={{
          color: ACCENT, flexShrink: 0,
          transition: 'transform 0.25s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </Box>

      <Collapse in={open} unmountOnExit>
        <Box sx={accentExpandedAreaSx(ACCENT)}>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.25 }}>
            {t('newPasswordLabel')}
          </Typography>
          <TextField
            value={value}
            inputRef={inputRef}
            onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="• • • •"
            size="small"
            fullWidth
            inputProps={{ inputMode: 'numeric', maxLength: 4, 'aria-label': t('newPasswordLabel'), style: { textAlign: 'center', fontSize: 22, fontWeight: 700, letterSpacing: 8 } }}
            sx={accentPinFieldSx(ACCENT)}
          />
        </Box>
      </Collapse>
    </Paper>
  );
});

ChangePasswordSection.displayName = 'ChangePasswordSection';
