import { useCallback, useEffect, useRef, useState, type HTMLAttributes, type ReactNode, type Ref, type UIEventHandler } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import { usePullToRefresh } from '../../features/list/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../../features/list/components/PullToRefreshIndicator';
import { PULL_MAX, PULL_THRESHOLD } from '../../features/list/helpers/list-helpers';

// רענון בגרירה אחיד לכל האפליקציה (רשימה, תובנות, עמודי המנהל).
//  • התוכן עצמו זז למטה, והחיווי מופיע ברווח שנפתח מעליו, כך שהוא אף פעם
//    לא מכסה כפתורים או כרטיסים.
//  • הרווח נשאר פתוח גם בזמן הרענון ובזמן ההודעה "עודכן" או "נכשל".
//  • "עודכן" מוצג רק כשהרענון באמת הצליח, "נכשל" רק כשבאמת נכשל.
//  • גרירה נוספת בזמן שרענון כבר רץ לא מפעילה רענון שני במקביל.

// גובה הרווח בזמן רענון: מספיק לכרטיס החיווי (22px + ריפוד) עם מרווח
const SETTLED_GAP = 56;
// כמה זמן ההודעה "עודכן"/"נכשל" נשארת (תואם ל־PullToRefreshIndicator)
const SUCCESS_HOLD_MS = 1600;
const FAIL_HOLD_MS = 2400;

interface Props {
  // מחזיר true בהצלחה. כשל (או חריגה) מציג "הרענון נכשל".
  onRefresh: () => Promise<boolean>;
  children: ReactNode;
  // מסך בלי כותרת קבועה מעליו: החיווי יורד מתחת לחריץ המצלמה
  safeTop?: boolean;
  // חוסם גרירה (למשל בזמן סידור מוצרים בגרירה)
  disabled?: boolean;
  // סגנון לאזור הגלילה עצמו (ריפוד, רקע)
  sx?: SxProps<Theme>;
  scrollRef?: Ref<HTMLDivElement>;
  onScroll?: UIEventHandler<HTMLDivElement>;
  // מאפיינים נוספים לאזור הגלילה: data-*, role, aria, onClick וכו'
  scrollAttrs?: Omit<HTMLAttributes<HTMLDivElement>, 'onScroll' | 'onTouchStart' | 'onTouchMove' | 'onTouchEnd'>
    & Record<`data-${string}`, string | boolean>;
}

export const PullRefreshArea = ({
  onRefresh, children, safeTop = false, disabled = false, sx, scrollRef, onScroll, scrollAttrs,
}: Props) => {
  const [refreshing, setRefreshing] = useState(false);
  // הרווח פתוח מתחילת הרענון ועד שההודעה אחריו נעלמת
  const [holding, setHolding] = useState(false);
  const [lastOkAt, setLastOkAt] = useState<Date | null>(null);
  const [failToken, setFailToken] = useState<number | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);

  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); }, []);

  const run = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setRefreshing(true);
    setHolding(true);
    onRefresh()
      .catch(() => false)
      .then((ok) => {
        runningRef.current = false;
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
        ref={scrollRef}
        {...scrollAttrs}
        onScroll={onScroll}
        onTouchStart={disabled ? undefined : handlePullStart}
        onTouchMove={disabled ? undefined : handlePullMove}
        onTouchEnd={disabled ? undefined : handlePullEnd}
        sx={[
          {
            height: '100%', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            // בלי transform כשאין משיכה: transform קבוע משנה את בסיס המיקום של
            // אלמנטים fixed בתוך האזור (למשל שורה נגררת בסידור מוצרים)
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
