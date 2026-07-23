import { Box, Typography, TextField, Button, IconButton, CircularProgress, Collapse } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useSettings } from '../../../global/context/SettingsContext';
import { haptic } from '../../../global/helpers';
import { MAX_TEXT_LENGTH, getCharCountColor } from '../helpers/dailyFaithManagerHelpers';
import {
  addCardSx, addCardHeaderSx, addCardTitleSx, goldFieldOnPaperSx,
  formatTipSx, formatTipCodeSx, helpButtonSx, addButtonSx,
} from '../styles/DailyFaithManager.styles';

interface DailyFaithAddCardProps {
  text: string;
  onTextChange: (value: string) => void;
  saving: boolean;
  onAdd: () => void;
  showFormatTip: boolean;
  onToggleFormatTip: () => void;
  isDark: boolean;
}

// כרטיס הוספת משפט חדש - מסגרת זהב עדינה שמפרידה ויזואלית מהרשימה
export const DailyFaithAddCard = ({ text, onTextChange, saving, onAdd, showFormatTip, onToggleFormatTip, isDark }: DailyFaithAddCardProps) => {
  const { t } = useSettings();
  const textCharCount = text.length;
  const charCountColor = getCharCountColor(textCharCount);

  return (
    <Box sx={addCardSx}>
      {/* כותרת כרטיס */}
      <Box sx={addCardHeaderSx}>
        <Typography sx={{ fontSize: 14 }}>✍️</Typography>
        <Typography sx={addCardTitleSx}>
          הוספת משפט חדש
        </Typography>
      </Box>

      {/* שדה טקסט ברוחב מלא */}
      <TextField
        fullWidth
        multiline
        minRows={2}
        maxRows={5}
        size="small"
        placeholder={t('dailyFaithPlaceholder')}
        value={text}
        onChange={(e) => onTextChange(e.target.value.slice(0, MAX_TEXT_LENGTH))}
        onKeyDown={(e) => {
          // קיצור דרך: Ctrl/Cmd + Enter לשמירה מהירה
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && text.trim().length >= 2 && !saving) {
            e.preventDefault();
            onAdd();
          }
        }}
        inputProps={{ maxLength: MAX_TEXT_LENGTH }}
        sx={goldFieldOnPaperSx}
      />

      {/* טיפ העיצוב - מופיע רק כשהמשתמש לוחץ על כפתור העזרה. לא מוצג קבוע. */}
      <Collapse in={showFormatTip} unmountOnExit>
        <Typography sx={formatTipSx}>
          💡 עטוף מילה ב־<Box component="span" sx={formatTipCodeSx}>*כוכביות*</Box> כדי להדגיש אותה (<Box component="span" sx={{ fontWeight: 800 }}>כמו ב-WhatsApp</Box>)
        </Typography>
      </Collapse>

      {/* שורה תחתונה: מונה תווים + כפתור עזרה + כפתור הוספה */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
        <Typography sx={{
          fontSize: 11, color: charCountColor, fontWeight: 700,
          fontVariantNumeric: 'tabular-nums', flex: 1,
        }}>
          {textCharCount} / {MAX_TEXT_LENGTH} תווים
        </Typography>
        <IconButton
          size="small"
          onClick={() => { haptic('light'); onToggleFormatTip(); }}
          aria-label="עזרה לעיצוב"
          sx={helpButtonSx(showFormatTip)}
        >
          <HelpOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <Button
          variant="contained"
          onClick={onAdd}
          disabled={saving || text.trim().length < 2}
          startIcon={saving ? null : <AddIcon sx={{ fontSize: 18 }} />}
          sx={addButtonSx(isDark)}
        >
          {saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'הוסף משפט'}
        </Button>
      </Box>
    </Box>
  );
};
