/**
 * template.controller.ts
 *
 * Controller לתבניות רשימות.
 * מותקן ב-/api/lists/templates ו-/api/lists/:id/save-as-template.
 */

import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { asyncHandler } from '../utils';
import * as templateService from '../services/template.service';

/** GET /api/lists/templates — כל התבניות של המשתמש */
export const getTemplates = asyncHandler(async (req: AuthRequest, res: Response) => {
  const templates = await templateService.getTemplates(req.user!.id);
  res.json({ success: true, data: templates });
});

/** POST /api/lists/:id/save-as-template — סימון/ביטול תבנית */
export const saveAsTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const value = req.body.isTemplate !== false; // ברירת מחדל: true
  const list = await templateService.setTemplate(req.params.id, req.user!.id, value);
  res.json({ success: true, data: list });
});

/** POST /api/lists/templates/:id/apply — יצירת רשימה מתבנית */
export const applyTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const list = await templateService.applyTemplate(req.params.id, req.user!.id);
  res.status(201).json({ success: true, data: list });
});

/** DELETE /api/lists/templates/:id — מחיקת תבנית */
export const deleteTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
  await templateService.deleteTemplate(req.params.id, req.user!.id);
  res.json({ success: true, message: 'Template deleted successfully' });
});
