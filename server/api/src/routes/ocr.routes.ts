import { Router } from 'express';
import { scanList } from '../controllers/ocr.controller';
import { authenticate, validate } from '../middleware';
import { ocrValidator } from '../validators';

const router = Router();

router.use(authenticate);

router.post('/scan-list', validate(ocrValidator.scanList), scanList);

export default router;
