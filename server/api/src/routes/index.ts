import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import listRoutes from './list.routes';
import productRoutes from './product.routes';
import adminRoutes from './admin.routes';
import notificationRoutes from './notification.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/lists', listRoutes);
router.use('/lists/:listId/products', productRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);

export default router;
