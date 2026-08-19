import { Router } from 'express';
import { chat, getStatus } from '../controllers/aiAssistant.controller';
import { authenticate, isAdmin, validate, aiAssistantLimiter } from '../middleware';
import { aiAssistantValidator } from '../validators';

const router = Router();

router.use(authenticate);

router.post('/chat', aiAssistantLimiter, validate(aiAssistantValidator.chat), chat);
router.get('/status', isAdmin, getStatus);

export default router;
