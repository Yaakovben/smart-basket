/**
 * insights.routes.ts
 *
 * Router של תובנות המשתמש.
 * מותקן ב-/api/insights ב-routes/index.ts.
 *
 * כל הנתיבים דורשים אימות (JWT בתוקף).
 */

import { Router } from 'express';
import { authenticate } from '../middleware';
import { getInsights } from '../controllers/insights.controller';

const router = Router();

// כל הנתיבים כאן דורשים משתמש מחובר
router.use(authenticate);

// GET /api/insights — החזרת כל התובנות של המשתמש המחובר
router.get('/', getInsights);

export default router;
