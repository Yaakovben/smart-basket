import { Router, type RequestHandler } from 'express';
import { chat } from '../controllers/aiAssistant.controller';
import { authenticate, validate, aiAssistantLimiter } from '../middleware';
import { aiAssistantValidator } from '../validators';
import { getAiDailyBudget } from '../services/aiAssistant.service';

const router = Router();

router.use(authenticate);

// תקציב יומי גלובלי (לכל האפליקציה) - נבדק אחרי המכסה הפר-משתמשית. שתי
// התגובות הן 429 עם resetAt; ה-code מבדיל בין "יותר מדי הודעות השעה" (הלימיטר)
// לבין "המכסה היומית נגמרה" (כאן), כדי שהלקוח יציג את ההודעה הנכונה + כמה
// זמן עד שזה חוזר, במקום שגיאה סתמית.
const aiDailyBudgetGuard: RequestHandler = (_req, res, next) => {
  const budget = getAiDailyBudget();
  if (budget.exceeded) {
    res.status(429).json({
      success: false,
      code: 'AI_DAILY_LIMIT',
      message: 'AI assistant daily limit reached',
      resetAt: budget.resetAt,
    });
    return;
  }
  next();
};

router.post('/chat', aiAssistantLimiter, aiDailyBudgetGuard, validate(aiAssistantValidator.chat), chat);

export default router;
