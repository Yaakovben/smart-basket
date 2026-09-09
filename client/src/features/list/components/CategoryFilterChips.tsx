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
  //  1. הרוחב עצמו מתכווץ עם הגלילה (לא נשאר "חור" קבוע) - השטח שהכפתור
  //     תפס עובר בפועל לרצועת הקטגוריות, שמקבלת פינוי אמיתי, לא רק חיווי
  //     חזותי בלי תוכן מאחוריו.
  //  2. בחזרה - הכפתור מתחיל "לחזור" כבר מהרגע שגוללים לכיוון ההתחלה, לא
  //     רק כשמגיעים ממש לאפס. בדיוק ההתנהגות של רצועות סינון באפליקציות
  //     מוקפדות (למשל טאבים שמתכווצים/מתרווחים בהתאם למיקום הגלילה עצמו).
  // מסונכרן ישירות ל-DOM דרך ref (בלי setState/בלי transition CSS) ומעודכן
  // ב-rAF - אותו דפדוד מדויק כמו סרגל הגלילה בהערה (ProductNoteField) -
  // מונע reflow עצמאי-מהגלילה (מה שגרם לריצוד/קפיצות בגרסה עם width+transition).
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
    el.style.width = `${TRAILING_WIDTH * (1 - progress)}px`;
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
    // alignItems:'flex-start' (לא center) - הקופסה הפנימית של הצ'יפים
    // כוללת pb:0.5 (מקום לסרגל גלילה) שגבוה מ-32px בפועל; עם center
    // trailing היה מתמרכז בתוך הגובה הזה וזז ~2px למטה מהצ'יפים. עם
    // flex-start שניהם מתחילים באותו y בדיוק - אותו גובה, בלי קפיצה.
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 1.5 }}>
      <Box
        onScroll={handleScroll}
        sx={{
          display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.5, flex: 1, minWidth: 0,
          // ה-bleed חייב להתאים בדיוק לריפוד של אזור התוכן ב-ListComponent
          // (p: { xs: 1.5, sm: 2.5 }) - אחרת הצ'יפים לא נצמדים לקצה בטאבלט.
          // רק בצד ההתחלה (ימין ב-RTL, שם רצועת הצ'יפים נפתחת) - הקצה השני
          // עכשיו יושב לצד trailing, לא נצמד למסך.
          mr: { xs: -1.5, sm: -2.5 }, pr: { xs: 1.5, sm: 2.5 },
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
        // width/opacity/transform מעודכנים ישירות ב-DOM (paintTrailing
        // למעלה) - בלי sx מותנה ובלי transition: הכיווץ *הוא* הגלילה עצמה
        // (1:1, פריים-פריים), לא אנימציה נפרדת שרצה על ציר זמן משלה.
        // ערכי ה-sx כאן הם רק ה"מנוחה" ההתחלתית (לפני שה-effect הראשון רץ).
        <Box ref={trailingRef} sx={{ flexShrink: 0, width: 32, opacity: 1, transform: 'scale(1)' }}>
          {trailing}
        </Box>
      )}
    </Box>
  );
});
CategoryFilterChips.displayName = 'CategoryFilterChips';
