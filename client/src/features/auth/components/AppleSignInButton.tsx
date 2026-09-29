import { Button, CircularProgress, Box } from '@mui/material';
import { siApple } from 'simple-icons';
import type { Language } from '../../../global/types';

// כפתור Sign in with Apple לפי הנחיות העיצוב של אפל: שחור עם לוגו לבן
// (לבן עם לוגו שחור במצב כהה), באותו גודל ובאותה בולטות כמו כפתור גוגל.
// אפל דורשת שהאפשרות לא תהיה קטנה או מוסתרת יותר מכניסה חברתית אחרת.
const LABEL: Record<Language, string> = {
  he: 'המשך עם Apple',
  en: 'Continue with Apple',
  ru: 'Войти через Apple',
};

interface Props {
  loading: boolean;
  onClick: () => void;
  language: Language;
  isDark: boolean;
}

export const AppleSignInButton = ({ loading, onClick, language, isDark }: Props) => {
  const fg = isDark ? '#000' : '#fff';
  return (
    <Button
      fullWidth
      onClick={onClick}
      disabled={loading}
      sx={{
        py: 1.5, px: 3, mt: 1.25,
        borderRadius: '12px',
        bgcolor: isDark ? '#fff' : '#000',
        color: fg,
        fontSize: 15, fontWeight: 600, textTransform: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25,
        transition: 'opacity 0.2s ease',
        '&:hover': { bgcolor: isDark ? '#fff' : '#000', opacity: 0.9 },
        '&.Mui-disabled': { bgcolor: isDark ? '#fff' : '#000', color: fg, opacity: 0.7 },
      }}
    >
      {loading ? (
        <CircularProgress size={20} sx={{ color: fg }} />
      ) : (
        <>
          <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18, flexShrink: 0 }} aria-hidden>
            <path fill={fg} d={siApple.path} />
          </Box>
          <span>{LABEL[language] ?? LABEL.en}</span>
        </>
      )}
    </Button>
  );
};
