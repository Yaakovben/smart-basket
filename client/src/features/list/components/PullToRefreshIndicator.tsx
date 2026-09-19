import { memo } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { PULL_THRESHOLD, PULL_MAX } from '../helpers/list-helpers';

// ===== אינדיקטור Pull to Refresh - משותף לכל האפליקציה =====
// "כרטיס צף" קומפקטי (לא פס מלא-רוחב שטוח) - בהשראת pull-to-refresh
// באפליקציות מובייל מובילות (Gmail/Twitter וכו'): פיל מעוגל עם צל, עולה
// מתחת לחריץ הבטיחות עם spring קליל, לא "נדבק" לרוחב המסך. אותו רכיב
// בדיוק בכל מסך שיש בו רענון (רשימה/דשבורד מנהל/בריאות DB/סטטוס AI) -
// זה מה שנותן את האחידות: תיקון/שיפור כאן משתקף בכל מקום בבת אחת.
// lastRefreshedAt: אם מועבר, "מעודכן ל-HH:MM" מוצג בתוך הכרטיס.
interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  pullActive: boolean;
  lastRefreshedAt?: Date | null;
}

export const PullToRefreshIndicator = memo(({ pullDistance, refreshing, pullActive, lastRefreshedAt }: PullToRefreshIndicatorProps) => {
  const timeLabel = lastRefreshedAt
    ? lastRefreshedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : null;
  const visible = pullDistance > 0 || refreshing;
  if (!visible) return null;

  const progress = Math.min(1, pullDistance / PULL_THRESHOLD);
  const ready = progress >= 1;
  // הכרטיס עצמו מופיע רק אחרי שקצת נמשך (8px) - בלי זה יש "רפרוף" של
  // כרטיס זעיר בכל נגיעה קלה בראש הרשימה שלא הייתה מיועדת למשיכה בכלל.
  const cardOpacity = refreshing ? 1 : Math.min(1, Math.max(0, (pullDistance - 8) / 22));
  const cardScale = refreshing ? 1 : 0.75 + Math.min(1, pullDistance / PULL_THRESHOLD) * 0.25;

  return (
    <Box aria-hidden="true" sx={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: refreshing ? 64 : Math.min(pullDistance, PULL_MAX),
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
        boxShadow: ready || refreshing
          ? '0 4px 16px rgba(20,184,166,0.28), 0 1px 3px rgba(0,0,0,0.08)'
          : '0 3px 12px rgba(0,0,0,0.12)',
        border: '1px solid',
        borderColor: ready || refreshing ? 'rgba(20,184,166,0.25)' : 'divider',
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

        <Typography sx={{
          fontSize: 12.5, fontWeight: 700, lineHeight: 1,
          color: ready || refreshing ? 'primary.main' : 'text.secondary',
          whiteSpace: 'nowrap',
          transition: pullActive ? 'color 0.15s ease' : 'none',
        }}>
          {refreshing ? 'מרענן…' : 'משכו לרענון'}
        </Typography>

        {timeLabel && (
          <>
            <Box aria-hidden="true" sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'divider', flexShrink: 0 }} />
            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: 'text.disabled', whiteSpace: 'nowrap' }}>
              מעודכן ל-{timeLabel}
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
});
PullToRefreshIndicator.displayName = 'PullToRefreshIndicator';
