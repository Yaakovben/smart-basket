import { Router } from 'express';
import { UserController } from '../controllers';
import { authenticate, validate } from '../middleware';
import { userValidator } from '../validators';

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get('/me', UserController.getProfile);
router.put('/me', validate(userValidator.updateProfile), UserController.updateProfile);
router.post('/me/change-password', validate(userValidator.changePassword), UserController.changePassword);
router.post('/me/muted-groups/toggle', validate(userValidator.toggleMuteGroup), UserController.toggleMuteGroup);
router.delete('/me', UserController.deleteAccount);

export default router;
