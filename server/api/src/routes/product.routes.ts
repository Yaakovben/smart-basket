import { Router } from 'express';
import {
  addProduct,
  updateProduct,
  deleteProduct,
  clearProducts,
  resetProducts,
  reorderProducts,
} from '../controllers/product.controller';
import { authenticate, validate } from '../middleware';
import { productValidator } from '../validators';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', validate({ body: productValidator.create, params: productValidator.listParams }), addProduct);
router.put('/reorder', validate({ body: productValidator.reorder, params: productValidator.listParams }), reorderProducts);
router.delete('/clear', validate({ params: productValidator.listParams }), clearProducts);
router.post('/reset', validate({ params: productValidator.listParams }), resetProducts);
router.put('/:productId', validate({ body: productValidator.update, params: productValidator.params }), updateProduct);
router.delete('/:productId', validate({ params: productValidator.params }), deleteProduct);

export default router;
