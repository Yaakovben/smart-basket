import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// User-facing routes
router.get('/', NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.put('/read-all', NotificationController.markAllAsRead);
router.put('/:id/read', NotificationController.markAsRead);

// Internal routes (for Socket server) - still require auth
router.post('/', NotificationController.createNotification);
router.post('/broadcast', NotificationController.createNotificationsForListMembers);

export default router;
