import { Router } from 'express';
import { getComparison, refreshPrices, refreshBranches, getStatus, testOsm, loadKnownBranchesSeed, getBranchesByChain } from '../controllers/priceComparison.controller';
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
router.get('/status', isAdmin, getStatus);

export default router;
