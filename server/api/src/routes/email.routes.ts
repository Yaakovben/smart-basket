import { Router } from 'express';
import Joi from 'joi';
import { broadcastEmail, sendEmailToUser, getEmailStatus } from '../controllers/email.controller';
import { authenticate, isAdmin, validate } from '../middleware';

const router = Router();

const broadcastSchema = Joi.object({
  subject: Joi.string().trim().min(1).max(150).required(),
  body: Joi.string().trim().min(1).max(2000).required(),
  onlyWithoutPush: Joi.boolean().optional(),
});

const sendToUserSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  subject: Joi.string().trim().min(1).max(150).required(),
  body: Joi.string().trim().min(1).max(2000).required(),
});

router.get('/status', authenticate, isAdmin, getEmailStatus);
router.post('/broadcast', authenticate, isAdmin, validate(broadcastSchema), broadcastEmail);
router.post('/send-to-user', authenticate, isAdmin, validate(sendToUserSchema), sendEmailToUser);

export default router;
