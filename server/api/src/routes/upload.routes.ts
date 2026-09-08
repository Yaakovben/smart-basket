import { Router } from 'express';
import { getUploadSignature, discardUpload } from '../controllers/upload.controller';
import { authenticate, imageUploadLimiter } from '../middleware';

const router = Router();

router.use(authenticate);

router.get('/signature', imageUploadLimiter, getUploadSignature);
router.post('/discard', imageUploadLimiter, discardUpload);

export default router;
