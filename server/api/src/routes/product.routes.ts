import { Router } from 'express';
import { ProductController } from '../controllers';
import { authenticate, validate } from '../middleware';
import { productValidator } from '../validators';

const router = Router({ mergeParams: true });

// All product routes require authentication
router.use(authenticate);

router.post('/', validate({ body: productValidator.create, params: productValidator.listParams }), ProductController.addProduct);
router.put('/reorder', validate({ body: productValidator.reorder, params: productValidator.listParams }), ProductController.reorderProducts);
router.put('/:productId', validate({ body: productValidator.update, params: productValidator.params }), ProductController.updateProduct);
router.delete('/:productId', validate({ params: productValidator.params }), ProductController.deleteProduct);
router.put('/:productId/toggle', validate({ params: productValidator.params }), ProductController.togglePurchased);

export default router;
