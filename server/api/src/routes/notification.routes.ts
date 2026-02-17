import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate, validate } from '../middleware';
import { notificationValidator } from '../validators';

const router = Router();

// כל נתיבי ההתראות דורשים אימות
router.use(authenticate);

// נתיבי משתמש
router.get('/', validate({ query: notificationValidator.getAll }), NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.put('/read-all', validate(notificationValidator.markAllRead), NotificationController.markAllAsRead);
router.put('/:id/read', validate({ params: notificationValidator.params }), NotificationController.markAsRead);

// נתיבים פנימיים (עבור שרת Socket)
router.post('/', validate(notificationValidator.create), NotificationController.createNotification);
router.post('/broadcast', validate(notificationValidator.broadcast), NotificationController.createNotificationsForListMembers);

export default router;
