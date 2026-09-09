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

  // trailing (כפתור "סידור מוצרים") מתכווץ ונעלם כשגוללים את רצועת הצ'יפים
  // הרחק מההתחלה - *בדיוק* לפי מרחק הגלילה, לא "נעלם/מופיע" בסוף/בהתחלה של
  // איזה סף. שני יתרונות על פני מצב בינארי + טיימר (איך שזה היה קודם):
  //  1. הרוחב עצמו מתכווץ עם הגלילה (לא נשאר "חור" קבוע) - הצ'יפים כבר
  //     פרושים על פני כל הרוחב מתחתיו (ראו למטה - trailing כבר לא flex
  //     sibling), אז כשהוא נעלם רואים אותם, לא שטח ריק.
  //  2. בחזרה - הכפתור מתחיל "לחזור" כבר מהרגע שגוללים לכיוון ההתחלה, לא
  //     רק כשמגיעים ממש לאפס. בדיוק ההתנהגות של רצועות סינון באפליקציות
  //     מוקפדות (למשל טאבים שמתכווצים/מתרווחים בהתאם למיקום הגלילה עצמו).
  //
  // trailing מוצב absolute *מעל* רצועת הצ'יפים (לא flex sibling שלה) - זה
  // קריטי ליציבות: בגרסה הקודמת trailing היה flex:0 בתוך אותה שורה כמו
  // רצועת הצ'יפים (flex:1), אז כיווץ הרוחב שלו שינה את ה-clientWidth של
  // רצועת הצ'יפים *בזמן שהיא נגללת*. כש-clientWidth גדל, ה-scrollLeft
  // המקסימלי האפשרי קטן - והדפדפן "תופס" את scrollLeft הנוכחי בחזרה כדי
  // שיישאר בטווח, מה שיורה אירוע scroll חדש עם ערך שונה -> משנה שוב את
  // הרוחב -> לולאת משוב שנראית כ"ריצוד". עם absolute, שינוי הרוחב של
  // trailing לא משפיע בכלל על ה-layout של רצועת הצ'יפים - אין תלות הדדית.
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
    // רק opacity+transform - לא width. trailing כבר absolute (לא flex
    // sibling של רצועת הצ'יפים), אז אין שום סיבה layout-ית לשנות את
    // הרוחב שלו; scale+opacity מספיקים חזותית לכל האפקט.
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
    // position:relative - עוגן ל-trailing (absolute) למטה.
    <Box sx={{ position: 'relative', mb: 1.5 }}>
      <Box
        onScroll={handleScroll}
        sx={{
          display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.5, width: '100%',
          // ה-bleed חייב להתאים בדיוק לריפוד של אזור התוכן ב-ListComponent
          // (p: { xs: 1.5, sm: 2.5 }) - אחרת הצ'יפים לא נצמדים לקצה בטאבלט.
          // רק בצד ההתחלה (ימין ב-RTL, שם רצועת הצ'יפים נפתחת).
          mr: { xs: -1.5, sm: -2.5 }, pr: { xs: 1.5, sm: 2.5 },
          // רווח שמור בקצה השני (שמאל ב-RTL, שם trailing יושב) - כדי
          // שבמנוחה הצ'יפ האחרון לא ייצמד/יתנגש עם הכפתור הצף, אלא ישאיר
          // "אוויר" נעים ביניהם. קבוע (לא תלוי-גלילה בכוונה) - ראו ההערה
          // למעלה על לולאת המשוב שגרם ריצוד כשזה היה דינמי.
          pl: trailing ? '46px' : 0,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          // גלילה חלקה/יציבה ב-iOS (momentum) - בלי זה overflow-x:auto נגלל
          // "קשה"/לא רציף במיוחד כשיש הרבה צ'יפים.
          WebkitOverflowScrolling: 'touch',
          maskImage: 'linear-gradient(to left, black calc(100% - 12px), transparent)',
          WebkitMaskImage: 'linear-gradient(to left, black calc(100% - 12px), transparent)',
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
        // absolute, לא flex sibling - ראו ההערה למעלה על לולאת המשוב
        // שזה פותר. insetInlineEnd:0 = הפינה השמאלית-עליונה הפיזית ב-RTL
        // (אותה פינה שבה trailing ישב קודם כ-flex sibling). opacity/
        // transform מעודכנים ישירות ב-DOM (paintTrailing למעלה) - בלי sx
        // מותנה ובלי transition: הכיווץ *הוא* הגלילה עצמה (1:1, פריים-
        // פריים), לא אנימציה נפרדת שרצה על ציר זמן משלה. ערכי ה-sx כאן הם
        // רק ה"מנוחה" ההתחלתית (לפני שה-effect הראשון רץ).
        <Box
          ref={trailingRef}
          sx={{
            position: 'absolute', insetInlineEnd: 0, top: 0,
            width: 32, height: 32, opacity: 1, transform: 'scale(1)',
          }}
        >
          {trailing}
        </Box>
      )}
    </Box>
  );
});
CategoryFilterChips.displayName = 'CategoryFilterChips';
