import { Router } from 'express';
import { AdminController } from '../controllers';
import { authenticate, isAdmin } from '../middleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

router.get('/users', AdminController.getUsers);
router.get('/activity', AdminController.getLoginActivity);
router.get('/stats', AdminController.getStats);
router.delete('/users/:userId', AdminController.deleteUser);

export default router;
