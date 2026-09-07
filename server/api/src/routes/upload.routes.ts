import { Router } from 'express';
import { getUploadSignature } from '../controllers/upload.controller';
import { authenticate, imageUploadLimiter } from '../middleware';

const router = Router();

router.use(authenticate);

router.get('/signature', imageUploadLimiter, getUploadSignature);

export default router;
