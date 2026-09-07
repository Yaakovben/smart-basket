import { Box } from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { PAPER_NOTE } from '../../helpers/paperNote';

// חיווי גלילה בתחתית פתק ההערה - פס פייד עדין שמתמזג עם ה"נייר" + חץ
// קטן שמרפרף. נשלט ע"י useScrollHint (מוצג רק כשיש עוד טקסט מתחת לקיפול
// הנראה). pointerEvents:none - לא חוסם גלילה/הקלדה.
export const NoteScrollHint = ({ show, isDark }: { show: boolean; isDark: boolean }) => {
  if (!show) return null;
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 4,
        height: 24, pointerEvents: 'none',
        // חיתוך לפינות התחתונות של הפתק (ב-'field' אין overflow:hidden).
        borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', pb: '2px',
        background: `linear-gradient(to top, ${isDark ? PAPER_NOTE.fadeDark : PAPER_NOTE.fadeLight} 0%, transparent 100%)`,
      }}
    >
      <KeyboardArrowDownRoundedIcon
        sx={{
          fontSize: 17,
          color: isDark ? PAPER_NOTE.inkDark : PAPER_NOTE.inkLight,
          animation: 'sbNoteScrollBob 1.4s ease-in-out infinite',
          '@keyframes sbNoteScrollBob': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(2px)' },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
    </Box>
  );
};
