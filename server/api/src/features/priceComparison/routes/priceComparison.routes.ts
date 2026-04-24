import { Router } from 'express';
import { getComparison, refreshPrices, getStatus } from '../controllers/priceComparison.controller';
import { authenticate, isAdmin } from '../../../middleware';

const router = Router();

router.use(authenticate);

// פתוח לכל משתמש מאומת
router.get('/', getComparison);

// ניהול: אדמין בלבד
router.post('/refresh', isAdmin, refreshPrices);
router.get('/status', isAdmin, getStatus);

export default router;
