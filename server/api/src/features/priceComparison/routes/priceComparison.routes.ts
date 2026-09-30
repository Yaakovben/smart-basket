import { Router } from 'express';
import { getComparison, refreshPrices, refreshBranches, syncTick } from '../controllers/sync.controller';
import { loadKnownBranchesSeed, getBranchesByChain, getBranchesNearby, getChainBranchOptions, createOrUpdateBranch, deleteBranch, cleanupUnverifiedBranches, bulkAddBranches } from '../controllers/branches.controller';
import { fillMissingAddresses } from '../controllers/fillAddresses.controller';
import { testOsm } from '../controllers/diagnostics.controller';
import { getStatus } from '../controllers/status.controller';
import { lookupBarcode, scanBarcode, warmScan } from '../controllers/barcode.controller';
import { searchProducts, setOverride, clearOverride } from '../controllers/overrides.controller';
import { getChains, getChainBranches, getBranchProductPrice, getProductComparison, postCompareBasket, getSources, getSyncLogs } from '../controllers/prices.controller';
import { authenticate, isAdmin, validate } from '../../../middleware';
import { pricesValidator } from '../../../validators/prices.validator';

const router = Router();

// דופק מתוזמן מבחוץ (GitHub Actions): לפני האימות, כי אין לו משתמש
router.post('/sync-tick', syncTick);

router.use(authenticate);

// פתוח לכל משתמש מאומת
router.get('/', getComparison);
router.get('/barcode/:barcode', lookupBarcode);
router.get('/scan-warmup', warmScan);
router.get('/scan/:barcode', scanBarcode);
router.get('/search', searchProducts);
router.put('/overrides', setOverride);
router.delete('/overrides', clearOverride);
router.get('/branches-nearby', getBranchesNearby);
router.get('/chain-branches/:chainId', getChainBranchOptions);

// API כללי למחירים: רשתות, סניפים, מחיר בסניף, השוואת מוצר והשוואת סל לפי ברקודים
router.get('/chains', getChains);
router.get('/chains/:chainId/branches', validate({ params: pricesValidator.chainParams, query: pricesValidator.chainBranchesQuery }), getChainBranches);
router.get('/branches/:branchId/products/:barcode', validate({ params: pricesValidator.branchProductParams, query: pricesValidator.clubQuery }), getBranchProductPrice);
router.get('/products/:barcode', validate({ params: pricesValidator.productParams }), getProductComparison);
router.post('/compare-basket', validate({ body: pricesValidator.compareBasket }), postCompareBasket);

// ניהול: אדמין בלבד
router.post('/refresh', isAdmin, refreshPrices);
router.post('/refresh-branches', isAdmin, refreshBranches);
router.post('/load-seed', isAdmin, loadKnownBranchesSeed);
router.get('/test-osm', isAdmin, testOsm);
router.get('/branches/:chainId', isAdmin, getBranchesByChain);
router.post('/branches', isAdmin, createOrUpdateBranch);
router.post('/branches/bulk', isAdmin, bulkAddBranches);
router.post('/branches/cleanup', isAdmin, cleanupUnverifiedBranches);
router.post('/branches/fill-addresses', isAdmin, fillMissingAddresses);
router.delete('/branches/:id', isAdmin, deleteBranch);
router.get('/status', isAdmin, getStatus);
router.get('/sources', isAdmin, getSources);
router.get('/sync-logs', isAdmin, validate({ query: pricesValidator.syncLogsQuery }), getSyncLogs);

export default router;
