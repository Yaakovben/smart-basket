import { Fragment } from 'react';
import { Box } from '@mui/material';

// פורמט בסגנון WhatsApp: *טקסט בכוכביות* יוצג כמודגש.
// תומך גם במספר קטעים באותה הודעה. לא רקורסיבי ולא תומך ב-nested.
//
// דוגמה:
//   "אמר הרב *אהוב את המצוות* - וברכה תבוא"
//        ↓
//   "אמר הרב " + <b>אהוב את המצוות</b> + " - וברכה תבוא"

const BOLD_REGEX = /\*([^*\n]+?)\*/g;

// גרסה שמחזירה JSX (לתצוגה)
export const renderFaithText = (text: string) => {
  if (!text) return text;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  // איפוס מצב ה-regex בין קריאות (g flag)
  BOLD_REGEX.lastIndex = 0;
  while ((match = BOLD_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <Box
        key={`b-${match.index}`}
        component="span"
        sx={{ fontWeight: 800 }}
      >
        {match[1]}
      </Box>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  // אם אין match - מחזירים את הטקסט כמו שהוא כדי לא לעטוף שלא לצורך
  if (parts.length === 0) return text;
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
};

// גרסה שמחזירה טקסט "נקי" בלי ה-* (לצורך השוואה/חיפוש)
export const stripFaithMarkers = (text: string): string => {
  return text.replace(BOLD_REGEX, (_, inner) => inner);
};
