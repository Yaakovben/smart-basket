import { memo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Box, Chip } from '@mui/material';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../global/constants';
import { useSettings } from '../../../global/context/SettingsContext';

// ===== שורת צ'יפים לסינון מוצרים לפי קטגוריה =====
interface CategoryFilterChipsProps {
  totalCount: number;
  activeCategories: string[];
  categoryCounts: Map<string, number>;
  effectiveCategoryFilter: string | null;
  onSelectCategory: (category: string | null) => void;
  // רכיב קבוע (לא גולל) בקצה השורה - כרגע כפתור "סדר מוצרים", כדי שלא
  // יפתח שורה נפרדת משלו רק בשביל זה (ראו ListComponent).
  trailing?: ReactNode;
}

export const CategoryFilterChips = memo(({
  totalCount,
  activeCategories,
  categoryCounts,
  effectiveCategoryFilter,
  onSelectCategory,
  trailing,
}: CategoryFilterChipsProps) => {
  const { t } = useSettings();

  // trailing (כפתור "סידור מוצרים") הוא flex sibling קבוע ליד רצועת
  // הצ'יפים הגוללת - לא צף מעליה (הבאג מהגרסה עם absolute: צ'יפ שנגלל
  // מכסה אותו). נוסה גם לכווץ את ה-width שלו בזמן גלילה (כדי שהקטגוריות
  // "יזרמו" לתוך המקום שמתפנה) - בבדיקה סינתטית עם עכבר זה נראה תקין,
  // אבל במגע אמיתי על מכשיר זה גרם לריצוד קשה: גלילה אינרציאלית אמיתית
  // יורה הרבה יותר אירועי scroll ברציפות מסימולציה, ושינוי ה-width של
  // trailing (סיבלינג flex) בזמן שהמיכל הסמוך גולל בפועל כן יוצר את
  // לולאת המשוב שחששנו ממנה מלכתחילה (clientWidth זז -> הדפדפן מתקן
  // scrollLeft -> עוד אירוע -> עוד תיקון width). בוטל - רק opacity+
  // transform מונפשים, לא width, בדיוק כדי שלא יהיה שום שינוי layout
  // בזמן הגלילה בכלל.
  const TRAILING_WIDTH = 32;
  // מרחק הגלילה (px) שמעליו הכפתור נעלם כליל - קשור לרוחב שלו עצמו
  // (נעלם "על פני הרוחב שלו"), לא מספר שרירותי.
  const COLLAPSE_DISTANCE = TRAILING_WIDTH;
  const trailingRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const paintTrailing = useCallback((scrollLeft: number) => {
    const el = trailingRef.current;
    if (!el) return;
    // Math.abs - המוסכמה של סימן scrollLeft ב-RTL לא אחידה בין דפדפנים,
    // אבל |scrollLeft| קטן תמיד אומר "קרוב להתחלה" בכל המוסכמות.
    const progress = Math.min(1, Math.abs(scrollLeft) / COLLAPSE_DISTANCE);
    el.style.opacity = String(1 - progress);
    el.style.transform = `scale(${1 - progress * 0.4})`;
    el.style.pointerEvents = progress > 0.5 ? 'none' : 'auto';
  }, [COLLAPSE_DISTANCE]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft } = e.currentTarget;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      paintTrailing(scrollLeft);
    });
  }, [paintTrailing]);

  useEffect(() => {
    paintTrailing(0); // מצב התחלתי - גלול לגמרי להתחלה, כפתור מלא
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [paintTrailing]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 1.5 }}>
      <Box
        onScroll={handleScroll}
        sx={{
          display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.5, minWidth: 0, flex: 1,
          // ה-bleed חייב להתאים בדיוק לריפוד של אזור התוכן ב-ListComponent
          // (p: { xs: 1.5, sm: 2.5 }) - אחרת הצ'יפים לא נצמדים לקצה בטאבלט.
          // רק בצד ההתחלה (ימין ב-RTL, שם רצועת הצ'יפים נפתחת).
          mr: { xs: -1.5, sm: -2.5 }, pr: { xs: 1.5, sm: 2.5 },
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          // גלילה חלקה/יציבה ב-iOS (momentum) - בלי זה overflow-x:auto נגלל
          // "קשה"/לא רציף במיוחד כשיש הרבה צ'יפים.
          WebkitOverflowScrolling: 'touch',
          // הערה: הוסרה דעיכת mask-image שהייתה כאן בקצה הרצועה - היא
          // תוכננה לתקופה שבה trailing (כפתור הסידור) ישב absolute *מעל*
          // הצ'יפים, כדי שצ'יפ שנגלל מתחתיו ייעלם בעדינות. עכשיו ש-trailing
          // הוא flex sibling רגיל עם המרווח (gap) שלו משלו, אותה דעיכה רק
          // גרמה לטקסט של הצ'יפ האחרון להיראות "קטוע"/שבור בלי שום צורך.
        }}>
        <Chip
          label={`${t('all')} (${totalCount})`}
          size="small"
          onClick={() => onSelectCategory(null)}
          sx={{
            fontSize: 12, fontWeight: 600, flexShrink: 0, height: 32,
            bgcolor: 'action.hover',
            color: 'text.primary',
            border: '1.5px solid',
            borderColor: !effectiveCategoryFilter ? 'primary.main' : 'transparent',
            boxShadow: !effectiveCategoryFilter ? '0 2px 10px rgba(20,184,166,0.35)' : 'none',
            transition: 'box-shadow 0.15s ease, border-color 0.15s ease, opacity 0.1s',
            '&:active': { opacity: 0.75 },
            '&:hover': { bgcolor: 'action.hover' },
          }}
        />
        {activeCategories.map(cat => {
          const count = categoryCounts.get(cat) || 0;
          const icon = CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] || '📦';
          const key = CATEGORY_TRANSLATION_KEYS[cat as keyof typeof CATEGORY_TRANSLATION_KEYS];
          const color = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || '#6B7280';
          const isActive = effectiveCategoryFilter === cat;
          return (
            <Chip
              key={cat}
              label={`${icon} ${key ? t(key) : cat} (${count})`}
              size="small"
              onClick={() => onSelectCategory(isActive ? null : cat)}
              sx={{
                fontSize: 12, fontWeight: 600, flexShrink: 0, height: 32,
                bgcolor: 'action.hover',
                color: 'text.primary',
                border: '1.5px solid',
                borderColor: isActive ? color : 'transparent',
                boxShadow: isActive ? `0 2px 10px ${color}66` : 'none',
                transition: 'box-shadow 0.15s ease, border-color 0.15s ease, opacity 0.1s',
                '&:active': { opacity: 0.75 },
                '&:hover': { bgcolor: 'action.hover' },
              }}
            />
          );
        })}
      </Box>
      {trailing && (
        // flex sibling עם רוחב קבוע - שומר מקום משלו, אף פעם לא מכוסה על
        // ידי צ'יפ שנגלל. opacity/transform בלבד מעודכנים ישירות ב-DOM
        // (paintTrailing למעלה) - בלי שינוי width, כדי שלא תהיה שום
        // תזוזת layout בזמן הגלילה (ראו ההערה למעלה על הריצוד שזה גרם לו).
        <Box
          ref={trailingRef}
          sx={{ flexShrink: 0, width: 32, height: 32, opacity: 1, transform: 'scale(1)' }}
        >
          {trailing}
        </Box>
      )}
    </Box>
  );
});
CategoryFilterChips.displayName = 'CategoryFilterChips';
