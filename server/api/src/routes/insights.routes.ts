import { Router } from 'express';
import { InsightsController } from '../controllers/insights.controller';
import { authenticate } from '../middleware';

const router = Router();

router.use(authenticate);
router.get('/', InsightsController.getInsights);
router.get('/price-comparison', InsightsController.getPriceComparison);

export default router;
