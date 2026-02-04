import { Router } from 'express';
import { getVapidPublicKey, subscribe, unsubscribe, getStatus } from '../controllers/push.controller';
import { authenticate } from '../middleware';

const router = Router();

// Public route - get VAPID public key
router.get('/vapid-public-key', getVapidPublicKey);

// Protected routes
router.post('/subscribe', authenticate, subscribe);
router.post('/unsubscribe', authenticate, unsubscribe);
router.get('/status', authenticate, getStatus);

export default router;
