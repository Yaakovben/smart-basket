import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import listRoutes from './list.routes';
import productRoutes from './product.routes';
import adminRoutes from './admin.routes';
import notificationRoutes from './notification.routes';
import pushRoutes from './push.routes';
import insightsRoutes from './insights.routes';
import { dailyFaithRoutes } from '../features/daily-faith';
import { priceComparisonRoutes } from '../features/priceComparison';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/lists', listRoutes);
router.use('/lists/:listId/products', productRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/push', pushRoutes);
router.use('/insights', insightsRoutes);
router.use('/price-comparison', priceComparisonRoutes);
router.use('/daily-faith', dailyFaithRoutes);

export default router;
