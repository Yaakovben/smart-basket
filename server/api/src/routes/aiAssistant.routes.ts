import { Router } from 'express';
import { chat } from '../controllers/aiAssistant.controller';
import { authenticate, validate, aiAssistantLimiter } from '../middleware';
import { aiAssistantValidator } from '../validators';

const router = Router();

router.use(authenticate);

router.post('/chat', aiAssistantLimiter, validate(aiAssistantValidator.chat), chat);

export default router;
