import { TextField, IconButton, InputAdornment, type TextFieldProps } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useSettings } from '../context/SettingsContext';

interface ClearableTextFieldProps extends Omit<TextFieldProps, 'value'> {
  value: string;
  onClear: () => void;
}

// TextField עם כפתור X שמופיע אחרי שהוקלדו יותר משני תווים, ומנקה את כל
// השדה בלחיצה אחת.
//
// אם לשדה כבר יש endAdornment משלו (למשל כפתור סריקת ברקוד) - ה-X מקבל
// סלוט ברוחב קבוע לצדו הימני (במקום להיכנס/לצאת מהתצוגה), כדי שהאייקון
// הקיים לא "יזוז" כל פעם שה-X מופיע/נעלם. בשדה רגיל בלי endAdornment
// משלו - אין סלוט קבוע, פשוט אין X עד שיש מה לנקות.
export const ClearableTextField = ({ value, onClear, InputProps, ...rest }: ClearableTextFieldProps) => {
  const { t } = useSettings();
  const showClear = value.length > 2;
  const customAdornment = InputProps?.endAdornment;

  const clearButton = (
    <IconButton
      onClick={onClear}
      size="small"
      sx={{ color: 'text.secondary' }}
      aria-label={t('close')}
      tabIndex={showClear ? 0 : -1}
    >
      <CloseIcon sx={{ fontSize: 18 }} />
    </IconButton>
  );

  const endAdornment = customAdornment ? (
    <>
      <InputAdornment
        position="end"
        sx={{
          width: 30, justifyContent: 'center', flexShrink: 0,
          opacity: showClear ? 1 : 0,
          pointerEvents: showClear ? 'auto' : 'none',
          transition: 'opacity 0.15s ease',
        }}
      >
        {clearButton}
      </InputAdornment>
      {customAdornment}
    </>
  ) : showClear ? (
    <InputAdornment position="end">{clearButton}</InputAdornment>
  ) : undefined;

  return (
    <TextField
      value={value}
      InputProps={{ ...InputProps, endAdornment }}
      {...rest}
    />
  );
};
