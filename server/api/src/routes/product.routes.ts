import { Router } from 'express';
import { ProductController } from '../controllers';
import { authenticate, validate } from '../middleware';
import { createProductSchema, updateProductSchema, reorderProductsSchema } from '../utils/validators';

const router = Router({ mergeParams: true });

// All product routes require authentication
router.use(authenticate);

router.post('/', validate(createProductSchema), ProductController.addProduct);
router.put('/reorder', validate(reorderProductsSchema), ProductController.reorderProducts);
router.put('/:productId', validate(updateProductSchema), ProductController.updateProduct);
router.delete('/:productId', ProductController.deleteProduct);
router.put('/:productId/toggle', ProductController.togglePurchased);

export default router;
