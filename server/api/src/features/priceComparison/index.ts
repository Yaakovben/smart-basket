// Public API של מודול השוואת המחירים.
// כל שאר השרת מייבא רק מכאן — לא מנבכי המודול.

export { default as priceComparisonRoutes } from './routes/priceComparison.routes';
export { startPriceSyncJob } from './jobs/priceSync.job';
export { PriceSyncService } from './services/priceSync.service';
export { PriceComparisonService, type PriceComparisonData, type PriceMatch } from './services/priceComparison.service';
export { Price, type IPriceDoc, type ChainId } from './models/Price.model';
export { PriceDAL, type UpsertPriceInput } from './dal/price.dal';
