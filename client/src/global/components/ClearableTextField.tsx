import { TextField, IconButton, InputAdornment, type TextFieldProps } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useSettings } from '../context/SettingsContext';

interface ClearableTextFieldProps extends Omit<TextFieldProps, 'value'> {
  value: string;
  onClear: () => void;
}

// TextField עם כפתור X שמופיע אחרי שהוקלדו יותר משני תווים, ומנקה את כל
// השדה בלחיצה אחת. אם לשדה כבר יש endAdornment משלו (למשל כפתור סריקת
// ברקוד), הוא ממשיך להופיע לצד כפתור הניקוי - לא מוחלף.
export const ClearableTextField = ({ value, onClear, InputProps, ...rest }: ClearableTextFieldProps) => {
  const { t } = useSettings();
  const showClear = value.length > 2;

  if (!showClear && !InputProps?.endAdornment) {
    return <TextField value={value} InputProps={InputProps} {...rest} />;
  }

  return (
    <TextField
      value={value}
      InputProps={{
        ...InputProps,
        endAdornment: (
          <>
            {InputProps?.endAdornment}
            {showClear && (
              <InputAdornment position="end">
                <IconButton
                  onClick={onClear}
                  size="small"
                  sx={{ color: 'text.secondary' }}
                  aria-label={t('close')}
                  tabIndex={-1}
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </InputAdornment>
            )}
          </>
        ),
      }}
      {...rest}
    />
  );
};
