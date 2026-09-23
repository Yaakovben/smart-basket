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
  updateUserPlan,
  getDbHealth,
  getCloudinaryHealth,
  getCloudinaryOrphans,
  clearCloudinaryDeadReferences,
  getLocalImages,
  getAiStatusHandler,
  refreshAiStatusHandler,
  getSubscriptionRequests,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
  getLegacyTrialGrant,
  getFeedback,
} from '../controllers/admin.controller';
import { authenticate, isAdmin, validate } from '../middleware';
import { commonSchemas, adminValidator } from '../validators';

const router = Router();

// כל הנתיבים כאן: משתמש מחובר + הרשאת אדמין
router.use(authenticate);
router.use(isAdmin);

const userIdParams = Joi.object({ userId: commonSchemas.objectId.required() });

const updatePlanBody = Joi.object({
  plan: Joi.string().valid('free', 'pro').required(),
  planExpiresAt: Joi.date().iso().allow(null).optional(),
});

const requestIdParams = Joi.object({ id: commonSchemas.objectId.required() });
const requestNoteBody = Joi.object({ note: Joi.string().trim().max(300).allow('').optional() });

router.get('/subscription-requests', getSubscriptionRequests);
router.post('/subscription-requests/:id/approve', validate({ params: requestIdParams, body: requestNoteBody }), approveSubscriptionRequest);
router.post('/subscription-requests/:id/reject', validate({ params: requestIdParams, body: requestNoteBody }), rejectSubscriptionRequest);
// מענק Pro חד-פעמי למשתמשים ותיקים - dry-run כברירת מחדל, ביצוע רק עם confirm=true.
router.get('/subscription/legacy-trial', getLegacyTrialGrant);
router.post('/subscription/legacy-trial', getLegacyTrialGrant);

router.get('/feedback', getFeedback);

router.get('/users', getUsers);
router.get('/activity', validate({ query: adminValidator.paginationQuery }), getLoginActivity);
router.get('/stats', getStats);
router.get('/db-health', getDbHealth);
router.get('/cloudinary-health', getCloudinaryHealth);
// dry-run כברירת מחדל (GET/POST בלי confirm) - מחיקה בפועל רק עם confirm=true.
router.get('/cloudinary-orphans', getCloudinaryOrphans);
router.post('/cloudinary-orphans', getCloudinaryOrphans);
// מנקה הפניות שבורות - מוצרים שמפנים לכתובת Cloudinary שכבר נמחקה שם.
router.post('/cloudinary-dead-references', clearCloudinaryDeadReferences);
// תמונות שנשמרו כ-data URL בתוך מסמכי המוצר (לא ב-Cloudinary) - אותו דפוס
// dry-run/confirm כמו cloudinary-orphans.
router.get('/local-images', getLocalImages);
router.post('/local-images', getLocalImages);
router.get('/ai-status', getAiStatusHandler);
router.post('/ai-status/refresh', refreshAiStatusHandler);
router.get('/users/:userId/details', validate({ params: userIdParams }), getUserDetails);
router.patch('/users/:userId/plan', validate({ params: userIdParams, body: updatePlanBody }), updateUserPlan);
router.delete('/users/:userId', validate({ params: userIdParams }), deleteUser);

export default router;
