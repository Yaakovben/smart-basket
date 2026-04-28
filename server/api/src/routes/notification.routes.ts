/**
 * notification.routes.ts
 *
 * נתיבי התראות המשתמש.
 * מותקן ב-/api/notifications. כל הנתיבים דורשים אימות.
 */

import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  createNotificationsForListMembers,
} from '../controllers/notification.controller';
import { authenticate, validate, notificationCreateLimiter } from '../middleware';
import { notificationValidator } from '../validators';

const router = Router();

router.use(authenticate);

// === נתיבי משתמש ===
router.get('/', validate({ query: notificationValidator.getAll }), getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', validate(notificationValidator.markAllRead), markAllAsRead);
router.put('/:id/read', validate({ params: notificationValidator.params }), markAsRead);

// === נתיבים פנימיים (משמשים ע״י שרת Socket) ===
// rate limit על יצירה/broadcast - מונע spam מצד לקוח זדוני
router.post('/', notificationCreateLimiter, validate(notificationValidator.create), createNotification);
router.post('/broadcast', notificationCreateLimiter, validate(notificationValidator.broadcast), createNotificationsForListMembers);

export default router;
