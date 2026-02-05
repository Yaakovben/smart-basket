import { Router } from 'express';
import { ListController } from '../controllers';
import { authenticate, validate, joinGroupLimiter } from '../middleware';
import { listValidator } from '../validators';

const router = Router();

// All list routes require authentication
router.use(authenticate);

router.get('/', ListController.getLists);
router.post('/', validate(listValidator.create), ListController.createList);
router.get('/:id', ListController.getList);
router.put('/:id', validate({ body: listValidator.update, params: listValidator.params }), ListController.updateList);
router.delete('/:id', ListController.deleteList);

// Group operations
// Strict rate limiting for joining groups - 10 attempts per 15 minutes (prevents code guessing)
router.post('/join', joinGroupLimiter, validate(listValidator.join), ListController.joinGroup);
router.post('/:id/leave', ListController.leaveGroup);
router.delete('/:id/members/:memberId', ListController.removeMember);

// Notifications
router.put('/:id/notifications/read', ListController.markNotificationsRead);
router.put('/:id/notifications/:notificationId/read', ListController.markNotificationRead);

export default router;
