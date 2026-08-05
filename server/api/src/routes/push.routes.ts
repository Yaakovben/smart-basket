import { Router } from 'express';
import Joi from 'joi';
import { getVapidPublicKey, subscribe, unsubscribe, getStatus, broadcast } from '../controllers/push.controller';
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

const broadcastSchema = Joi.object({
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

// שידור לכל המשתמשים - אדמין בלבד
router.post('/broadcast', authenticate, isAdmin, validate(broadcastSchema), broadcast);

export default router;
