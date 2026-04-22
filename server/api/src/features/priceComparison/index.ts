// Public API של מודול השוואת המחירים.
// כל שאר השרת מייבא רק מכאן — לא מנבכי המודול.

export { default as priceComparisonRoutes } from './routes/priceComparison.routes';
export { startPriceSyncJob } from './jobs/priceSync.job';
export { syncAllChains, type SyncResult } from './services/priceSync.service';
export {
  getComparisonForUser,
  invalidateUser,
  type PriceComparisonData,
  type PriceMatch,
  type PriceListGroup,
} from './services/priceComparison.service';
export { Price, type IPriceDoc, type ChainId } from './models/Price.model';
export { PriceDAL, type UpsertPriceInput } from './dal/price.dal';
