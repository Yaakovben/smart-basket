import { Router } from 'express';
import { PriceComparisonController } from '../controllers/priceComparison.controller';
import { authenticate } from '../../../middleware';

const router = Router();

router.use(authenticate);
router.get('/', PriceComparisonController.getComparison);

export default router;
