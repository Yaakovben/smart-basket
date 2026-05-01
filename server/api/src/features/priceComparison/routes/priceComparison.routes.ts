import { Router } from 'express';
import { getComparison, refreshPrices, refreshBranches, getStatus, testOsm, loadKnownBranchesSeed, getBranchesByChain, createOrUpdateBranch, deleteBranch, cleanupUnverifiedBranches, bulkAddBranches, fillMissingAddresses } from '../controllers/priceComparison.controller';
import { authenticate, isAdmin } from '../../../middleware';

const router = Router();

router.use(authenticate);

// פתוח לכל משתמש מאומת
router.get('/', getComparison);

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

export default router;
