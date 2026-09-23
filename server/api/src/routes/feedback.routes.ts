import { Router } from 'express';
import Joi from 'joi';
import { authenticate, validate } from '../middleware';
import { createFeedback } from '../controllers/feedback.controller';

const router = Router();

const feedbackSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  message: Joi.string().trim().max(2000).allow('').optional(),
});

router.use(authenticate);
router.post('/', validate({ body: feedbackSchema }), createFeedback);

export default router;
