import { Router } from 'express';
import Joi from 'joi';
import { getVapidPublicKey, subscribe, unsubscribe, getStatus, broadcast, sendToUser, registerNativeDevice, unregisterNativeDevice } from '../controllers/push.controller';
import { authenticate, isAdmin, validate } from '../middleware';

const router = Router();

const subscribeSchema = Joi.object({
  subscription: Joi.object({
    endpoint: Joi.string().uri().required(),
    keys: Joi.object({
      p256dh: Joi.string().required(),
      auth: Joi.string().required(),
    }).required(),
  }).required(),
});

const unsubscribeSchema = Joi.object({
  endpoint: Joi.string().uri().required(),
});

// טוקן של האפליקציה מהחנות: FCM (אנדרואיד) או APNs (iOS, 64 תווי hex)
const nativeRegisterSchema = Joi.object({
  token: Joi.string().trim().min(20).max(4096).required(),
  platform: Joi.string().valid('ios', 'android').required(),
});

const nativeUnregisterSchema = Joi.object({
  token: Joi.string().trim().min(20).max(4096).required(),
});

const broadcastSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).required(),
  body: Joi.string().trim().min(1).max(300).required(),
  url: Joi.string().uri({ relativeOnly: true }).optional(),
});

const sendToUserSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  title: Joi.string().trim().min(1).max(100).required(),
  body: Joi.string().trim().min(1).max(300).required(),
  url: Joi.string().uri({ relativeOnly: true }).optional(),
});

// נתיב ציבורי
router.get('/vapid-public-key', getVapidPublicKey);

// נתיבים מוגנים
router.post('/subscribe', authenticate, validate(subscribeSchema), subscribe);
router.post('/unsubscribe', authenticate, validate(unsubscribeSchema), unsubscribe);
router.get('/status', authenticate, getStatus);

// התראות באפליקציות מהחנות
router.post('/native/register', authenticate, validate(nativeRegisterSchema), registerNativeDevice);
router.post('/native/unregister', authenticate, validate(nativeUnregisterSchema), unregisterNativeDevice);

// שידור לכל המשתמשים - אדמין בלבד
router.post('/broadcast', authenticate, isAdmin, validate(broadcastSchema), broadcast);
// שליחה למשתמש ספציפי אחד - אדמין בלבד
router.post('/send-to-user', authenticate, isAdmin, validate(sendToUserSchema), sendToUser);

export default router;
