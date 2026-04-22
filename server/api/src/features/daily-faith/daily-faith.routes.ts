import { Router } from 'express';
import Joi from 'joi';
import { DailyFaithController } from './daily-faith.controller';
import { authenticate, isAdmin, validate } from '../../middleware';
import { commonSchemas } from '../../validators';

const router = Router();

router.use(authenticate);

// פתוח לכל משתמש מאומת
router.get('/random', DailyFaithController.getRandom);

// אדמין בלבד
router.get('/', isAdmin, DailyFaithController.getAll);
router.post(
  '/',
  isAdmin,
  validate({ body: Joi.object({ text: Joi.string().min(2).max(500).required() }) }),
  DailyFaithController.create
);
router.delete(
  '/:id',
  isAdmin,
  validate({ params: Joi.object({ id: commonSchemas.objectId.required() }) }),
  DailyFaithController.remove
);

export default router;
