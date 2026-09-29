import { memo, useRef, useState } from 'react';
import { Box, Typography, TextField, Collapse, Paper } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useSettings } from '../../../../global/context/SettingsContext';
import { focusWithKeyboard } from '../../../../global/helpers/focusWithKeyboard';
import {
  settingsRowSx, rowLabelSx, rowHintSx, settingsCardSx, settingsIconBoxSx, accentPinFieldSx, accentExpandedAreaSx, SETTINGS_ACCENTS,
} from './listSettingsCardSx';

const ACCENT = SETTINGS_ACCENTS.group;

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
  const paperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // פתיחת הקטע פותחת מיד את המקלדת על שדה הקוד, והשדה נגלל מעליה
  const toggle = () => {
    if (open) {
      onPasswordChange('');
      setOpen(false);
      return;
    }
    setOpen(true);
    focusWithKeyboard(paperRef.current, () => inputRef.current);
  };

  return (
    <Paper ref={paperRef} elevation={0} sx={settingsCardSx(ACCENT, open)}>
      <Box sx={settingsRowSx} onClick={toggle}>
        <Box component="span" sx={settingsIconBoxSx(ACCENT)}>👥</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={rowLabelSx}>{t('convertToGroup')}</Typography>
          <Typography sx={rowHintSx}>{t('convertToGroupHint')}</Typography>
        </Box>
        <ExpandMoreRoundedIcon sx={{
          color: ACCENT, flexShrink: 0,
          transition: 'transform 0.25s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </Box>

      <Collapse in={open} unmountOnExit>
        <Box sx={accentExpandedAreaSx(ACCENT)}>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1.5, lineHeight: 1.55 }}>
            {t('convertToGroupExplain')}
          </Typography>

          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.25 }}>
            {t('setGroupPassword')}
          </Typography>

          <TextField
            fullWidth
            value={password}
            inputRef={inputRef}
            onChange={e => onPasswordChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="• • • •"
            size="small"
            inputProps={{ inputMode: 'numeric', maxLength: 4, 'aria-label': t('setGroupPassword'), style: { textAlign: 'center', fontSize: 22, fontWeight: 700, letterSpacing: 8 } }}
            sx={accentPinFieldSx(ACCENT)}
          />
        </Box>
      </Collapse>
    </Paper>
  );
});

ConvertToGroupSection.displayName = 'ConvertToGroupSection';
