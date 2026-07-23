import { useState, useRef, useCallback } from 'react';
import { haptic } from '../../../global/helpers';
import { PULL_THRESHOLD, PULL_MAX } from '../helpers/list-helpers';

// משיכה למטה כשהגלילה בראש הדף מפעילה רענון. סף 70px מהנקודה ההתחלתית,
// עם התנגדות גומייה שמתעמעמת ככל שמושכים יותר.
export const usePullToRefresh = (onRefresh: () => void) => {
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartY = useRef(0);
  const pullActive = useRef(false);

  const handlePullStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop > 0) return;
    pullStartY.current = e.touches[0].clientY;
    pullActive.current = true;
  }, []);

  const handlePullMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!pullActive.current) return;
    const delta = e.touches[0].clientY - pullStartY.current;
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
