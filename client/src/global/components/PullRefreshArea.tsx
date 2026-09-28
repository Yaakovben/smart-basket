import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import { usePullToRefresh } from '../../list/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../../list/components/PullToRefreshIndicator';
import { PULL_MAX, PULL_THRESHOLD } from '../../list/helpers/list-helpers';

// רענון בגרירה אחיד לכל עמודי המנהל. התוכן עצמו זז למטה, והחיווי מופיע
// ברווח שנפתח מעליו, כך שהוא אף פעם לא מכסה כפתורים או כרטיסים. הרווח
// נשאר פתוח גם בזמן הרענון ובזמן ההודעה "עודכן" או "נכשל", ונסגר אחריהן.

// גובה הרווח בזמן רענון: מספיק לכרטיס החיווי (22px + ריפוד) עם מרווח
const SETTLED_GAP = 56;
// כמה זמן ההודעה "עודכן"/"נכשל" נשארת (תואם ל־PullToRefreshIndicator)
const SUCCESS_HOLD_MS = 1600;
const FAIL_HOLD_MS = 2400;

interface Props {
  // מחזיר true בהצלחה. כשל מציג "הרענון נכשל".
  onRefresh: () => Promise<boolean>;
  children: ReactNode;
  // מסך בלי כותרת קבועה מעליו (הדשבורד): החיווי יורד מתחת לחריץ המצלמה
  safeTop?: boolean;
  // סגנון לאזור הגלילה עצמו (ריפוד, רקע)
  sx?: SxProps<Theme>;
}

export const AdminPullRefresh = ({ onRefresh, children, safeTop = false, sx }: Props) => {
  const [refreshing, setRefreshing] = useState(false);
  // הרווח פתוח מתחילת הרענון ועד שההודעה אחריו נעלמת
  const [holding, setHolding] = useState(false);
  const [lastOkAt, setLastOkAt] = useState<Date | null>(null);
  const [failToken, setFailToken] = useState<number | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); }, []);

  const run = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setRefreshing(true);
    setHolding(true);
    onRefresh()
      .catch(() => false)
      .then((ok) => {
        if (ok) setLastOkAt(new Date()); else setFailToken(Date.now());
        setRefreshing(false);
        holdTimer.current = setTimeout(() => setHolding(false), ok ? SUCCESS_HOLD_MS : FAIL_HOLD_MS);
      });
  }, [onRefresh]);

  const { pullDistance, pullActiveRef, handlePullStart, handlePullMove, handlePullEnd } = usePullToRefresh(run);
  // eslint-disable-next-line react-hooks/refs -- ref מכוון, ראו usePullToRefresh.ts
  const pullActive = pullActiveRef.current;

  const pull = Math.min(pullDistance, PULL_MAX);
  // עם חריץ: מוסיפים את גובה החריץ בהדרגה לפי התקדמות המשיכה, בלי קפיצה
  const safe = (fraction: number) => (safeTop ? ` + env(safe-area-inset-top) * ${fraction.toFixed(3)}` : '');
  const offset = pull > 0
    ? `calc(${pull}px${safe(Math.min(1, pull / PULL_THRESHOLD))})`
    : holding ? `calc(${SETTLED_GAP}px${safe(1)})` : null;

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', left: 0, right: 0, top: safeTop ? 'env(safe-area-inset-top)' : 0, zIndex: 5 }}>
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          refreshing={refreshing}
          pullActive={pullActive}
          lastRefreshedAt={lastOkAt}
          refreshFailedToken={failToken}
        />
      </Box>
      <Box
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
        sx={[
          {
            height: '100%', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            transform: offset ? `translateY(${offset})` : 'none',
            transition: pullActive ? 'none' : 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {children}
      </Box>
    </Box>
  );
};
