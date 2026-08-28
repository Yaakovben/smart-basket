import { memo } from 'react';

interface IconPatternProps {
  seed: number;
  size: number;
}

// דפוס רקע דק (opacity נמוך) בתוך אריח/עיגול צבעוני - כדי ששתי רשימות
// באותו צבע+אמוג'י עדיין ייראו קצת שונות זו מזו (זהות אמיתית, לא רק
// בחירת אמוג'י). 4 וריאציות SVG inline, נבחרות דטרמיניסטית לפי seed
// (hashSeed ב-iconArt.ts) - לא נטענות כקובץ חיצוני, בלי עלות רשת.
export const IconPattern = memo(({ seed, size }: IconPatternProps) => {
  const variant = seed % 4;
  const rotate = (seed % 45) - 22; // סיבוב עדין ומגוון, לא זהה לכל האייקונים באותה וריאציה
  const common = {
    width: size, height: size,
    style: { position: 'absolute' as const, inset: 0, opacity: 0.16, transform: `rotate(${rotate}deg)`, pointerEvents: 'none' as const },
    'aria-hidden': true,
  };

  if (variant === 0) {
    // נקודות
    return (
      <svg {...common} viewBox="0 0 100 100">
        {[20, 50, 80].flatMap(cx => [25, 55, 85].map(cy => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={6} fill="white" />
        )))}
      </svg>
    );
  }
  if (variant === 1) {
    // גלים
    return (
      <svg {...common} viewBox="0 0 100 100">
        <path d="M0 30 Q 25 10 50 30 T 100 30" stroke="white" strokeWidth={6} fill="none" />
        <path d="M0 65 Q 25 45 50 65 T 100 65" stroke="white" strokeWidth={6} fill="none" />
      </svg>
    );
  }
  if (variant === 2) {
    // בועות
    return (
      <svg {...common} viewBox="0 0 100 100">
        <circle cx={30} cy={35} r={22} fill="white" />
        <circle cx={75} cy={70} r={14} fill="white" />
        <circle cx={80} cy={25} r={8} fill="white" />
      </svg>
    );
  }
  // ניצוצות
  return (
    <svg {...common} viewBox="0 0 100 100">
      {[[22, 28], [78, 22], [30, 78], [72, 75]].map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y - 9} L${x + 3} ${y - 3} L${x + 9} ${y} L${x + 3} ${y + 3} L${x} ${y + 9} L${x - 3} ${y + 3} L${x - 9} ${y} L${x - 3} ${y - 3} Z`} fill="white" />
      ))}
    </svg>
  );
});
IconPattern.displayName = 'IconPattern';
