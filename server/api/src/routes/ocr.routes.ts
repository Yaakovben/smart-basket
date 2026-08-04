import { Router } from 'express';
import { scanList } from '../controllers/ocr.controller';
import { authenticate, validate, ocrLimiter } from '../middleware';
import { ocrValidator } from '../validators';

const router = Router();

router.use(authenticate);

router.post('/scan-list', ocrLimiter, validate(ocrValidator.scanList), scanList);

export default router;
