/**
 * user.routes.ts
 *
 * נתיבי המשתמש המחובר.
 * מותקן ב-/api/users.
 */

import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  toggleMuteGroup,
  updateListOrder,
  deleteMyAccount,
} from '../controllers/user.controller';
import { authenticate, validate, passwordChangeLimiter } from '../middleware';
import { userValidator } from '../validators';

const router = Router();

// כל הנתיבים כאן דורשים אימות
router.use(authenticate);

router.get('/me', getProfile);
router.put('/me', validate(userValidator.updateProfile), updateProfile);
router.post(
  '/me/change-password',
  passwordChangeLimiter,
  validate(userValidator.changePassword),
  changePassword
);
router.post(
  '/me/muted-groups/toggle',
  validate(userValidator.toggleMuteGroup),
  toggleMuteGroup
);
router.put('/me/list-order', validate(userValidator.updateListOrder), updateListOrder);
router.delete('/me', deleteMyAccount);

export default router;
