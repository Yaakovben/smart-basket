import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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

  // trailing (כפתור "סידור מוצרים") נעלם כשגוללים את רצועת הצ'יפים הרחק
  // מההתחלה, וחוזר כשגוללים בחזרה - כמו באפליקציות עם רצועות סינון.
  // Math.abs (לא בדיקת סימן) כי המוסכמה של scrollLeft ב-RTL לא אחידה בין
  // דפדפנים - אבל scrollLeft===0 (בקירוב) תמיד אומר "בהתחלה" בכל המוסכמות.
  //
  // שני תיקוני יציבות (היו "מרצדים"/"קופצים" עם הרבה קטגוריות):
  //  1. הסתרה (SHOW_AT..HIDE_AT) - "אזור מת" בין שני ספים שונים במקום סף
  //     יחיד, כדי שרעד קטן סביב נקודה בודדת (למשל rubber-band bounce
  //     ב-iOS בקצה הגלילה) לא יגרום להחלפה הלוך-חזור. גם: החזרה חייבת
  //     "להתייצב" DEBOUNCE_MS לפני שבאמת חוזרים - מעבר חטוף/רגעי מתחת לסף
  //     (למשל באמצע האטת מומנטום) לא מספיק כדי להחזיר את הכפתור.
  //  2. האנימציה עצמה (למטה, ב-sx) עברה מ-width (גורם ל-reflow של כל שאר
  //     הצ'יפים בכל פריים, בדיוק בזמן שהם ממילא נגללים - זה מה שגרם
  //     לקפיצות/ריצוד) ל-opacity+transform בלבד (compositor, בלי reflow
  //     בכלל) - הרוחב נשאר קבוע (32px שמורים תמיד), רק נעלם/מופיע חזותית.
  const HIDE_AT = 14;
  const SHOW_AT = 4;
  const DEBOUNCE_MS = 140;
  const [scrolled, setScrolled] = useState(false);
  const showTimerRef = useRef<number | null>(null);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const x = Math.abs(e.currentTarget.scrollLeft);
    if (x > HIDE_AT) {
      if (showTimerRef.current != null) { window.clearTimeout(showTimerRef.current); showTimerRef.current = null; }
      setScrolled(prev => (prev ? prev : true));
    } else if (x < SHOW_AT && showTimerRef.current == null) {
      showTimerRef.current = window.setTimeout(() => {
        showTimerRef.current = null;
        setScrolled(false);
      }, DEBOUNCE_MS);
    }
    // בין SHOW_AT ל-HIDE_AT - אזור מת, לא נוגעים במצב בכלל.
  }, []);
  useEffect(() => () => {
    if (showTimerRef.current != null) window.clearTimeout(showTimerRef.current);
  }, []);

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
        // הרוחב (32px) *קבוע תמיד* - לא נכנס ל-sx המותנה למטה בכלל. רק
        // opacity+transform (compositor, בלי layout/reflow) עושים את
        // ה"היעלמות" - זו הסיבה שזה כבר לא גורם לריצוד/קפיצות עם הרבה
        // צ'יפים: לפני כן width היה משתנה, מה שאילץ reflow של כל השורה
        // בכל פריים אנימציה, בדיוק תוך כדי גלילה - זה מה שנראה "לא יציב".
        // pointerEvents:none כשמוסתר כי המקום עדיין תפוס (אין display:none).
        <Box sx={{
          flexShrink: 0,
          width: 32,
          opacity: scrolled ? 0 : 1,
          transform: scrolled ? 'scale(0.55)' : 'scale(1)',
          pointerEvents: scrolled ? 'none' : 'auto',
          transition: 'opacity 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {trailing}
        </Box>
      )}
    </Box>
  );
});
CategoryFilterChips.displayName = 'CategoryFilterChips';
