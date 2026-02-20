import { Router } from 'express';
import { AdminController } from '../controllers';
import { authenticate, isAdmin, validate } from '../middleware';
import { commonSchemas, adminValidator } from '../validators';
import Joi from 'joi';

const router = Router();


// כל נתיבי הניהול דורשים אימות והרשאת מנהל
router.use(authenticate);
router.use(isAdmin);

const userIdParams = Joi.object({ userId: commonSchemas.objectId.required() });

router.get('/users', AdminController.getUsers);
router.get('/activity', validate({ query: adminValidator.paginationQuery }), AdminController.getLoginActivity);
router.get('/stats', AdminController.getStats);
router.delete('/users/:userId', validate({ params: userIdParams }), AdminController.deleteUser);

export default router;
