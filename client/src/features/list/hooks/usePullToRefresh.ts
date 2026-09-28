import { useState, useRef, useCallback } from 'react';
import { haptic } from '../../../global/helpers';
import { PULL_THRESHOLD, PULL_MAX } from '../helpers/list-helpers';

// משיכה למטה כשהגלילה בראש הדף מפעילה רענון. סף 70px מהנקודה ההתחלתית,
// עם התנגדות גומייה שמתעמעמת ככל שמושכים יותר.
// תנועה ראשונה של כמה פיקסלים קובעת את כיוון המחווה. החלקה הצידה (למשל
// החלקה על מוצר ברשימה) לא מושכת את חיווי הרענון, גם אם יש בה קצת ירידה.
const DIRECTION_LOCK_PX = 8;

export const usePullToRefresh = (onRefresh: () => void) => {
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartY = useRef(0);
  const pullStartX = useRef(0);
  const pullActive = useRef(false);
  const directionLocked = useRef(false);

  const handlePullStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop > 0 || e.touches.length > 1) return;
    pullStartY.current = e.touches[0].clientY;
    pullStartX.current = e.touches[0].clientX;
    directionLocked.current = false;
    pullActive.current = true;
  }, []);

  const handlePullMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!pullActive.current) return;
    const delta = e.touches[0].clientY - pullStartY.current;
    if (!directionLocked.current) {
      const dx = Math.abs(e.touches[0].clientX - pullStartX.current);
      if (dx < DIRECTION_LOCK_PX && Math.abs(delta) < DIRECTION_LOCK_PX) return;
      directionLocked.current = true;
      if (dx > Math.abs(delta)) {
        pullActive.current = false;
        return;
      }
    }
    if (delta < 0) {
      pullActive.current = false;
      setPullDistance(0);
      return;
    }
    const eased = Math.min(PULL_MAX, Math.sqrt(delta) * 8);
    setPullDistance(eased);
  }, []);

  const handlePullEnd = useCallback(() => {
    if (!pullActive.current) return;
    pullActive.current = false;
    if (pullDistance >= PULL_THRESHOLD) {
      haptic('medium');
      onRefresh();
    }
    setPullDistance(0);
  }, [pullDistance, onRefresh]);

  return {
    pullDistance,
    // מוחזר כ-ref (לא כערך) כדי שקריאת .current תתבצע ברינדור של הצרכן,
    // לא כאן - קריאת ref.current בגוף ה-hook עצמו נחשבת "קריאה בזמן רינדור".
    pullActiveRef: pullActive,
    handlePullStart,
    handlePullMove,
    handlePullEnd,
  };
};
