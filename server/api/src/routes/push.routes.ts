import { Router } from 'express';
import Joi from 'joi';
import { getVapidPublicKey, subscribe, unsubscribe, getStatus } from '../controllers/push.controller';
import { authenticate, validate } from '../middleware';

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

// נתיב ציבורי
router.get('/vapid-public-key', getVapidPublicKey);

// נתיבים מוגנים
router.post('/subscribe', authenticate, validate(subscribeSchema), subscribe);
router.post('/unsubscribe', authenticate, validate(unsubscribeSchema), unsubscribe);
router.get('/status', authenticate, getStatus);

export default router;
