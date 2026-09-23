import { memo, useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PriorityHighRoundedIcon from '@mui/icons-material/PriorityHighRounded';
import { PULL_THRESHOLD, PULL_MAX } from '../helpers/list-helpers';

// כמה זמן להשאיר "מעודכן ל-HH:MM" על המסך אחרי שרענון הושלם בפועל, לפני
// שהכרטיס דועך - מספיק כדי שהמשתמש יספיק לקרוא, לא כה ארוך שמרגיש תקוע.
const SUCCESS_DISPLAY_MS = 1600;

// ===== אינדיקטור Pull to Refresh - משותף לכל האפליקציה =====
// "כרטיס צף" קומפקטי (לא פס מלא-רוחב שטוח) - בהשראת pull-to-refresh
// באפליקציות מובייל מובילות (Gmail/Twitter וכו'): פיל מעוגל עם צל, עולה
// מתחת לחריץ הבטיחות עם spring קליל, לא "נדבק" לרוחב המסך. אותו רכיב
// בדיוק בכל מסך שיש בו רענון (רשימה/דשבורד מנהל/בריאות DB/סטטוס AI) -
// זה מה שנותן את האחידות: תיקון/שיפור כאן משתקף בכל מקום בבת אחת.
// lastRefreshedAt: זמן הרענון המוצלח האחרון בפועל (מהצרכן, אחרי שהנתונים
// כבר חזרו מהשרת - לא זמן משוער). "מעודכן ל-HH:MM" מוצג רק לרגע קצר אחרי
// שרענון *הושלם*, לא בזמן משיכה/טעינה - כדי שלא ייראה כאילו זה מוצג "בזמן
// אמת" בזמן שבפועל הוא עדיין הזמן הישן.
interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  pullActive: boolean;
  lastRefreshedAt?: Date | null;
  // מזהה ייחודי (למשל Date.now()) שמשתנה בכל כישלון רענון בפועל - כדי
  // שהחיווי יופעל מחדש גם על כישלונות עוקבים. לא boolean רגיל כי מעבר
  // false→true→false על אותו רענון לא היה נתפס כאירוע חדש ב-useEffect.
  refreshFailedToken?: number | null;
}

export const PullToRefreshIndicator = memo(({ pullDistance, refreshing, pullActive, lastRefreshedAt, refreshFailedToken }: PullToRefreshIndicatorProps) => {
  // הזמן מוצג *רק* אחרי שרענון אמיתי הושלם (לא בזמן משיכה/גרירה, ולא
  // בזמן הטעינה עצמה) - בלי זה "מעודכן ל-HH:MM" הישן נשאר תלוי על המסך
  // לכל אורך המשיכה, לפני שבאמת התעדכן משהו, ונראה כאילו זה הזמן הנוכחי.
  // wasRefreshing עוקב אחרי המעבר true→false כדי לתפוס בדיוק את רגע הסיום.
  const wasRefreshing = useRef(false);
  const [justUpdatedAt, setJustUpdatedAt] = useState<Date | null>(null);
  const [justFailed, setJustFailed] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFailedTokenRef = useRef<number | null | undefined>(refreshFailedToken);

  useEffect(() => {
    // רק אם הצרכן מעביר lastRefreshedAt בפועל - במסכים שלא מעבירים אותו
    // (למשל דשבורד אדמין) ממשיכים בלי חיווי "עודכן עכשיו", בדיוק כמו קודם.
    if (wasRefreshing.current && !refreshing && lastRefreshedAt) {
      // הזמן שמגיע כאן הוא הזמן האמיתי שאליו התעדכן (מתעדכן ל-new Date()
      // אצל הצרכן רק אחרי שהנתונים באמת חזרו מהשרת בהצלחה - ראו
      // useListActions.refreshList) - לא זמן משוער.
      setJustUpdatedAt(lastRefreshedAt);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setJustUpdatedAt(null), SUCCESS_DISPLAY_MS);
    }
    wasRefreshing.current = refreshing;
  }, [refreshing, lastRefreshedAt]);

  // חיווי כישלון - בלעדיו, רענון שנכשל פשוט משאיר את הספינר נעלם בשקט בלי
  // שום משוב, ונראה כאילו "לא קרה כלום" (או גרוע יותר - שהרענון עדיין
  // "תקוע" רץ). כל token חדש (גם אם שונה מהקודם ל-undefined/null) מציג
  // הודעת שגיאה אדומה למשך זמן קבוע, בדיוק כמו חיווי ההצלחה.
  useEffect(() => {
    if (refreshFailedToken != null && refreshFailedToken !== lastFailedTokenRef.current) {
      lastFailedTokenRef.current = refreshFailedToken;
      setJustFailed(true);
      setJustUpdatedAt(null);
      if (failHideTimerRef.current) clearTimeout(failHideTimerRef.current);
      failHideTimerRef.current = setTimeout(() => setJustFailed(false), SUCCESS_DISPLAY_MS + 800);
    }
  }, [refreshFailedToken]);

  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (failHideTimerRef.current) clearTimeout(failHideTimerRef.current);
  }, []);

  const timeLabel = justUpdatedAt
    ? justUpdatedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : null;
  const visible = pullDistance > 0 || refreshing || !!justUpdatedAt || justFailed;
  if (!visible) return null;

  const progress = justUpdatedAt || justFailed ? 1 : Math.min(1, pullDistance / PULL_THRESHOLD);
  const ready = progress >= 1;
  const settled = refreshing || !!justUpdatedAt || justFailed;
  // הכרטיס עצמו מופיע רק אחרי שקצת נמשך (8px) - בלי זה יש "רפרוף" של
  // כרטיס זעיר בכל נגיעה קלה בראש הרשימה שלא הייתה מיועדת למשיכה בכלל.
  const cardOpacity = settled ? 1 : Math.min(1, Math.max(0, (pullDistance - 8) / 22));
  const cardScale = settled ? 1 : 0.75 + Math.min(1, pullDistance / PULL_THRESHOLD) * 0.25;

  return (
    <Box aria-hidden="true" sx={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: settled ? 64 : Math.min(pullDistance, PULL_MAX),
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      pb: 1,
      transition: pullActive ? 'none' : 'height 0.28s cubic-bezier(0.34, 1.3, 0.64, 1)',
      zIndex: 5,
      pointerEvents: 'none',
    }}>
      {/* כרטיס צף - צל רך, פינות מעוגלות לגמרי, רקע אטום */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        pl: 1.25, pr: 1.75, py: 0.75,
        borderRadius: '999px',
        bgcolor: 'background.paper',
        boxShadow: justFailed
          ? '0 4px 16px rgba(239,68,68,0.28), 0 1px 3px rgba(0,0,0,0.08)'
          : ready || refreshing
          ? '0 4px 16px rgba(20,184,166,0.28), 0 1px 3px rgba(0,0,0,0.08)'
          : '0 3px 12px rgba(0,0,0,0.12)',
        border: '1px solid',
        borderColor: justFailed ? 'rgba(239,68,68,0.3)' : ready || refreshing ? 'rgba(20,184,166,0.25)' : 'divider',
        opacity: cardOpacity,
        transform: `scale(${cardScale})`,
        transition: pullActive ? 'box-shadow 0.2s ease, border-color 0.2s ease' : 'transform 0.25s cubic-bezier(0.34,1.4,0.64,1), opacity 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      }}>
        <Box sx={{
          position: 'relative',
          width: 22, height: 22, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CircularProgress
            variant={refreshing ? 'indeterminate' : 'determinate'}
            value={refreshing ? undefined : progress * 100}
            size={22}
            thickness={5}
            sx={{
              color: justFailed ? '#EF4444' : ready || refreshing ? 'primary.main' : 'text.disabled',
              transition: pullActive ? 'color 0.15s ease' : 'none',
            }}
          />
          <Box sx={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: refreshing ? 0 : 1,
            transition: 'opacity 0.15s ease',
          }}>
            {justFailed ? (
              <PriorityHighRoundedIcon sx={{
                fontSize: 14, color: '#EF4444',
                animation: 'ptrPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                '@keyframes ptrPop': {
                  from: { transform: 'scale(0.5)', opacity: 0 },
                  to: { transform: 'scale(1)', opacity: 1 },
                },
              }} />
            ) : ready ? (
              <CheckRoundedIcon sx={{
                fontSize: 14, color: 'primary.main',
                animation: 'ptrPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                '@keyframes ptrPop': {
                  from: { transform: 'scale(0.5)', opacity: 0 },
                  to: { transform: 'scale(1)', opacity: 1 },
                },
              }} />
            ) : (
              <ArrowDownwardRoundedIcon sx={{
                fontSize: 13, color: 'text.disabled',
                transform: `rotate(${progress * 180}deg)`,
                transition: pullActive ? 'none' : 'transform 0.15s ease',
              }} />
            )}
          </Box>
        </Box>

        {!justUpdatedAt && !justFailed && (refreshing || ready) && (
          <Typography sx={{
            fontSize: 12.5, fontWeight: 700, lineHeight: 1,
            color: 'primary.main',
            whiteSpace: 'nowrap',
          }}>
            {refreshing ? 'מרענן…' : 'שחרר לרענון'}
          </Typography>
        )}

        {timeLabel && (
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap' }}>
            עודכן עכשיו · {timeLabel}
          </Typography>
        )}

        {justFailed && (
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#EF4444', whiteSpace: 'nowrap' }}>
            הרענון נכשל · בדוק חיבור
          </Typography>
        )}
      </Box>
    </Box>
  );
});
PullToRefreshIndicator.displayName = 'PullToRefreshIndicator';
