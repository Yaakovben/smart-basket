import { SvgIcon, type SvgIconProps } from '@mui/material';

// אייקון עוזר ה-AI: פשוט מציג את המילה "AI" עצמה (טקסט SVG, לא path
// מצויר-ביד) - הדרך היחידה להיות חד-משמעית "זה AI" בלי תלות בפרשנות
// חזותית של סמל מופשט (ניצוצות/כוכבים לא זוהו כ-AI בבדיקות קודמות).
// כוכב נצנוץ קטן בפינה מוסיף רמז ויזואלי בלי לפגוע בבהירות הטקסט.
// fill="currentColor" כמו כל אייקון MUI רגיל, מקבל sx/color/fontSize כרגיל.
export const AiAssistantIcon = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <text
      x="10.5" y="17"
      textAnchor="middle"
      fontSize="13"
      fontWeight="800"
      fontFamily="Arial, Helvetica, sans-serif"
      letterSpacing="-0.5"
      fill="currentColor"
    >
      AI
    </text>
    {/* ניצוץ קטן בפינה בצבע זהב קבוע (לא currentColor) - בולט על כל רקע
        ונותן לאייקון זהות צבעונית משלו, לא רק לבן כמו שאר האייקונים */}
    <path d="M19.3 2.2c.16 1.05.46 1.75.95 2.24.49.49 1.19.79 2.24.95-1.05.16-1.75.46-2.24.95-.49.49-.79 1.19-.95 2.24-.16-1.05-.46-1.75-.95-2.24-.49-.49-1.19-.79-2.24-.95 1.05-.16 1.75-.46 2.24-.95.49-.49.79-1.19.95-2.24Z" fill="#FCD34D" />
  </SvgIcon>
);
