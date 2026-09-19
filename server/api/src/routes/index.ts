import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import listRoutes from './list.routes';
import productRoutes from './product.routes';
import adminRoutes from './admin.routes';
import notificationRoutes from './notification.routes';
import pushRoutes from './push.routes';
import insightsRoutes from './insights.routes';
import ocrRoutes from './ocr.routes';
import uploadRoutes from './upload.routes';
import aiAssistantRoutes from './aiAssistant.routes';
import { dailyFaithRoutes } from '../features/daily-faith';
import { priceComparisonRoutes } from '../features/priceComparison';
import emailRoutes from './email.routes';
import subscriptionRoutes from './subscription.routes';
import errorReportRoutes from './errorReport.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/lists', listRoutes);
router.use('/lists/:listId/products', productRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/push', pushRoutes);
router.use('/insights', insightsRoutes);
router.use('/ocr', ocrRoutes);
router.use('/uploads', uploadRoutes);
router.use('/ai-assistant', aiAssistantRoutes);
router.use('/price-comparison', priceComparisonRoutes);
router.use('/daily-faith', dailyFaithRoutes);
router.use('/email', emailRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/error-report', errorReportRoutes);

export default router;
