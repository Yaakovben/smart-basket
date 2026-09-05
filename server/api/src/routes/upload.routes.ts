import { Router } from 'express';
import { uploadProductImage } from '../controllers/upload.controller';
import { authenticate, validate, imageUploadLimiter } from '../middleware';
import { uploadValidator } from '../validators';

const router = Router();

router.use(authenticate);

router.post('/product-image', imageUploadLimiter, validate(uploadValidator.productImage), uploadProductImage);

export default router;
