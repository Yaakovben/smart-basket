import { memo } from 'react';
import { Box, CircularProgress } from '@mui/material';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { PULL_THRESHOLD, PULL_MAX } from '../helpers/list-helpers';

// ===== אינדיקטור Pull to Refresh - מופיע מעל התוכן בזמן משיכה =====
// טבעת התקדמות אמיתית (0%-100% עד סף המשיכה) סביב חץ שמסתובב בהדרגה;
// בהגעה לסף - הטבעת מתמלאת, "קופצת" קלות והחץ מתחלף לוי - מצב "ניתן
// לשחרר" ברור ושונה מ"עדיין למשוך". בזמן הרענון עצמו - ספינר אמיתי
// (indeterminate), לא רק סיבוב CSS על אייקון קבוע.
interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  pullActive: boolean;
}

export const PullToRefreshIndicator = memo(({ pullDistance, refreshing, pullActive }: PullToRefreshIndicatorProps) => {
  if (!(pullDistance > 0 || refreshing)) return null;

  const progress = Math.min(1, pullDistance / PULL_THRESHOLD);
  const ready = progress >= 1;

  return (
    <Box sx={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: refreshing ? 54 : Math.min(pullDistance, PULL_MAX),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: 'background.default',
      transition: pullActive ? 'none' : 'height 0.25s cubic-bezier(0.34, 1.2, 0.64, 1)',
      zIndex: 5,
      pointerEvents: 'none',
    }}>
      <Box sx={{
        position: 'relative',
        width: 38, height: 38,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: !refreshing && ready ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <CircularProgress
          variant={refreshing ? 'indeterminate' : 'determinate'}
          value={refreshing ? undefined : progress * 100}
          size={38}
          thickness={4}
          sx={{
            color: ready || refreshing ? 'primary.main' : 'text.disabled',
            transition: pullActive ? 'color 0.15s ease' : 'none',
          }}
        />
        <Box sx={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: refreshing ? 0 : 1,
          transition: 'opacity 0.15s ease',
        }}>
          {ready ? (
            // גדול יותר מהחץ - הצ'קמארק הוא ה"תוצאה" הסופית (רענון הצליח /
            // אפשר לשחרר), צריך להיות בולט מספיק שנראה גם כשהחלק העליון של
            // המסך חופף עם מצלמה קדמית שמכסה חלק מהתוכן במכשירים מסוימים.
            <CheckRoundedIcon sx={{
              fontSize: 22, color: 'primary.main',
              animation: 'ptrPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              '@keyframes ptrPop': {
                from: { transform: 'scale(0.5)', opacity: 0 },
                to: { transform: 'scale(1)', opacity: 1 },
              },
            }} />
          ) : (
            <ArrowDownwardRoundedIcon sx={{
              fontSize: 18, color: 'text.disabled',
              transform: `rotate(${progress * 180}deg)`,
              transition: pullActive ? 'none' : 'transform 0.15s ease',
            }} />
          )}
        </Box>
      </Box>
    </Box>
  );
});
PullToRefreshIndicator.displayName = 'PullToRefreshIndicator';
