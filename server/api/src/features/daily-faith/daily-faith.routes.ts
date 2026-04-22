import { Router } from 'express';
import Joi from 'joi';
import { getRandom, getAll, create, remove } from './daily-faith.controller';
import { authenticate, isAdmin, validate } from '../../middleware';
import { commonSchemas } from '../../validators';

const router = Router();

router.use(authenticate);

// פתוח לכל משתמש מאומת
router.get('/random', getRandom);

// אדמין בלבד
router.get('/', isAdmin, getAll);
router.post(
  '/',
  isAdmin,
  validate({ body: Joi.object({ text: Joi.string().min(2).max(500).required() }) }),
  create
);
router.delete(
  '/:id',
  isAdmin,
  validate({ params: Joi.object({ id: commonSchemas.objectId.required() }) }),
  remove
);

export default router;
