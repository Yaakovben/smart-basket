import { Router } from 'express';
import { ListController } from '../controllers';
import { authenticate, validate } from '../middleware';
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
router.post('/join', validate(joinGroupSchema), ListController.joinGroup);
router.post('/:id/leave', ListController.leaveGroup);
router.delete('/:id/members/:memberId', ListController.removeMember);

// Notifications
router.put('/:id/notifications/read', ListController.markNotificationsRead);

export default router;
