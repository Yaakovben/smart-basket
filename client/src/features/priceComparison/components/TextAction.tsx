import { memo } from 'react';
import { ButtonBase } from '@mui/material';

interface TextActionProps {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  // גודל הגופן. ברירת מחדל 11 - פעולה משנית בתוך כרטיס.
  fontSize?: number;
}

// פעולה טקסטואלית קטנה ("החלף סניף", "לא המוצר הנכון?") כלחצן אמיתי: נגיש למקלדת
// ולקורא מסך, עם סימון פוקוס. במקום Typography עם onClick, שאין לו אף אחד מאלה.
// עוצר bubbling כדי שהלחיצה לא תפתח או תסגור את כרטיס הרשת שמכיל אותה.
export const TextAction = memo(({ children, onClick, fontSize = 11 }: TextActionProps) => (
  <ButtonBase
    onClick={e => { e.stopPropagation(); onClick(e); }}
    sx={{
      fontSize, fontWeight: 800, color: '#0D9488',
      width: 'fit-content', borderRadius: '4px', px: 0.25,
      '&:hover': { textDecoration: 'underline' },
      '&.Mui-focusVisible': { outline: '2px solid #0D9488', outlineOffset: 1 },
    }}
  >
    {children}
  </ButtonBase>
));
TextAction.displayName = 'TextAction';
