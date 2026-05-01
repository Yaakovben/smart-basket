/**
 * admin.routes.ts
 *
 * נתיבי ניהול - כולם דורשים authenticate + isAdmin.
 * מותקן ב-/api/admin.
 */

import { Router } from 'express';
import Joi from 'joi';
import {
  getUsers,
  getLoginActivity,
  getStats,
  getUserDetails,
  deleteUser,
  getDbHealth,
} from '../controllers/admin.controller';
import { authenticate, isAdmin, validate } from '../middleware';
import { commonSchemas, adminValidator } from '../validators';

const router = Router();

// כל הנתיבים כאן: משתמש מחובר + הרשאת אדמין
router.use(authenticate);
router.use(isAdmin);

const userIdParams = Joi.object({ userId: commonSchemas.objectId.required() });

router.get('/users', getUsers);
router.get('/activity', validate({ query: adminValidator.paginationQuery }), getLoginActivity);
router.get('/stats', getStats);
router.get('/db-health', getDbHealth);
router.get('/users/:userId/details', validate({ params: userIdParams }), getUserDetails);
router.delete('/users/:userId', validate({ params: userIdParams }), deleteUser);

export default router;
