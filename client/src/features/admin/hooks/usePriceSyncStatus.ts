// usePriceSyncStatus - טעינת סטטוס המאגר, פולינג בזמן סנכרון פעיל, והפעלת רענון ידני.

import { useCallback, useEffect, useState } from 'react';
import { haptic } from '../../../global/helpers';
import { priceComparisonApi, type PriceSyncStatus } from '../../priceComparison';
import type { SyncFeedback } from '../types/priceSync-types';

export function usePriceSyncStatus() {
  const [status, setStatus] = useState<PriceSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<SyncFeedback | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await priceComparisonApi.getStatus();
      setStatus(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // poll בזמן סנכרון פעיל - מחירים או סניפים
  const syncActive = !!status?.syncInProgress || !!status?.branchSync?.active || refreshing;
  useEffect(() => {
    if (!syncActive) return;
    const interval = setInterval(load, 3_000);
    return () => clearInterval(interval);
  }, [syncActive, load]);

  // הצגת תוצאה כשסנכרון סניפים מסתיים
  const lastBranchCompletedAt = status?.branchSync?.completedAt;
  useEffect(() => {
    if (!lastBranchCompletedAt || status?.branchSync?.active) return;
    const bs = status?.branchSync;
    if (!bs) return;
    if (bs.error) setFeedback({ msg: `שגיאה: ${bs.error}`, tone: 'error' });
    else if (bs.totalUpserted > 0) setFeedback({ msg: `✓ ${bs.totalUpserted} סניפים עודכנו`, tone: 'info' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBranchCompletedAt]);

  // רענון ידני: מחירים + סניפים יחד
  const handleRefresh = async () => {
    haptic('medium');
    setRefreshing(true);
    setFeedback(null);
    try {
      // רץ במקביל
      await Promise.allSettled([
        priceComparisonApi.refresh(),
        priceComparisonApi.refreshBranches(),
      ]);
      setFeedback({ msg: 'סנכרון החל - יתעדכן אוטומטית', tone: 'info' });
      setTimeout(load, 2000);
    } catch {
      setFeedback({ msg: 'שגיאה בהפעלת סנכרון', tone: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const totalPrices = status?.totalPrices ?? 0;
  const chains = status?.chains ?? [];
  const totalBranches = chains.reduce((s, c) => s + (c.branchCount ?? 0), 0);
  const totalBranchesWithCoords = chains.reduce((s, c) => s + (c.branchesWithCoords ?? 0), 0);

  return {
    status, loading, refreshing, feedback, setFeedback, load, syncActive, handleRefresh,
    totalPrices, chains, totalBranches, totalBranchesWithCoords,
  };
}
