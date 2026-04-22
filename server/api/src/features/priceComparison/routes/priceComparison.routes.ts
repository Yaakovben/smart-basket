import { Router } from 'express';
import { getComparison } from '../controllers/priceComparison.controller';
import { authenticate } from '../../../middleware';

const router = Router();

router.use(authenticate);
router.get('/', getComparison);

export default router;
