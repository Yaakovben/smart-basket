import { Router } from 'express';
import { ListController } from '../controllers';
import { authenticate, validate, joinGroupLimiter } from '../middleware';
import { createListSchema, updateListSchema, joinGroupSchema } from '../utils/validators';

const router = Router();

// All list routes require authentication
router.use(authenticate);

router.get('/', ListController.getLists);
router.post('/', validate(createListSchema), ListController.createList);
router.get('/:id', ListController.getList);
router.put('/:id', validate(updateListSchema), ListController.updateList);
router.delete('/:id', ListController.deleteList);

// Group operations
// Strict rate limiting for joining groups - 10 attempts per 15 minutes (prevents code guessing)
router.post('/join', joinGroupLimiter, validate(joinGroupSchema), ListController.joinGroup);
router.post('/:id/leave', ListController.leaveGroup);
router.delete('/:id/members/:memberId', ListController.removeMember);

// Notifications
router.put('/:id/notifications/read', ListController.markNotificationsRead);
router.put('/:id/notifications/:notificationId/read', ListController.markNotificationRead);

export default router;
