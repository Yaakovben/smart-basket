// אומדן עלות עדין לרשימה - נטען ברקע אחרי שהרשימה נפתחת (לא חוסם, לא מוצג
// עד שיש תוצאה). מבוסס על אותו endpoint שמזין את טאב "מחירים" בתובנות
// (priceComparisonApi.getComparison), רק מצומצם לרשימה הנוכחית בלבד.
import { useEffect, useState } from 'react';
import { priceComparisonApi } from '../../priceComparison/services/priceComparison.api';

export interface ListCostEstimate {
  estimatedTotal: number;
  matchedCount: number;
  pendingCount: number;
}

export function useListCostEstimate(listId: string, pendingCount: number): {
  estimate: ListCostEstimate | null;
  loading: boolean;
} {
  const [estimate, setEstimate] = useState<ListCostEstimate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pendingCount === 0) {
      setEstimate(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    priceComparisonApi.getComparison(listId)
      .then(res => {
        if (cancelled) return;
        const group = res.lists?.find(l => l.listId === listId) ?? res.lists?.[0];
        if (group && group.matchedCount > 0) {
          setEstimate({ estimatedTotal: group.estimatedTotal, matchedCount: group.matchedCount, pendingCount: group.pendingCount });
        } else {
          setEstimate(null);
        }
      })
      .catch(() => { if (!cancelled) setEstimate(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, pendingCount]);

  return { estimate, loading };
}
