import { Router } from 'express';
import Joi from 'joi';
import { validate, errorReportLimiter } from '../middleware';
import { reportClientError } from '../controllers/errorReport.controller';

const router = Router();

const errorReportSchema = Joi.object({
  type: Joi.string().valid('global', 'unhandledRejection', 'react').required(),
  message: Joi.string().trim().min(1).max(500).required(),
  stack: Joi.string().max(5000).optional().allow(''),
  url: Joi.string().max(500).optional().allow(''),
  userAgent: Joi.string().max(300).optional().allow(''),
  buildVersion: Joi.string().max(100).optional().allow(''),
  timestamp: Joi.string().isoDate().required(),
});

// endpoint ציבורי (ללא auth) - כדי לתפוס גם שגיאות לפני login
router.post('/', errorReportLimiter, validate(errorReportSchema), reportClientError);

export default router;
