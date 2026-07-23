// useChainStatusFilter - פילטר רשתות לפי סטטוס (שגיאות/ללא סניפים/ללא מחירים).

import { useState } from 'react';
import type { PriceChainStatus } from '../../priceComparison';
import type { ChainStatusFilterValue } from '../types/priceSync-types';

export function useChainStatusFilter(chains: PriceChainStatus[]) {
  const [statusFilter, setStatusFilter] = useState<ChainStatusFilterValue>('all');

  const filteredChains = chains.filter(c => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'errors') return !!c.lastSyncError;
    if (statusFilter === 'no_branches') return !c.branchCount || c.branchCount === 0;
    if (statusFilter === 'no_prices') return c.count === 0;
    return true;
  });
  const errorCount = chains.filter(c => !!c.lastSyncError).length;
  const noBranchCount = chains.filter(c => !c.branchCount || c.branchCount === 0).length;
  const noPriceCount = chains.filter(c => c.count === 0).length;

  return { statusFilter, setStatusFilter, filteredChains, errorCount, noBranchCount, noPriceCount };
}
