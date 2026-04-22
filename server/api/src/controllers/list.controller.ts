/**
 * list.controller.ts
 *
 * Controller של רשימות ומוצרים: CRUD של רשימה + ניהול חברות קבוצה.
 * מותקן ב-/api/lists. כל הנתיבים דורשים אימות.
 */

import type { Response } from 'express';
import type { AuthRequest } from '../types';
import type { CreateListInput, UpdateListInput, JoinGroupInput } from '../validators';
import { asyncHandler } from '../utils';
import * as listService from '../services/list.service';

/** GET /api/lists — כל הרשימות של המשתמש */
export const getLists = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lists = await listService.getUserLists(req.user!.id);
  res.json({ success: true, data: lists });
});

/** GET /api/lists/:id — רשימה בודדת */
export const getList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const list = await listService.getList(req.params.id, req.user!.id);
  res.json({ success: true, data: list });
});

/** POST /api/lists — יצירת רשימה חדשה */
export const createList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = req.body as CreateListInput;
  const list = await listService.createList(req.user!.id, data);
  res.status(201).json({ success: true, data: list });
});

/** PUT /api/lists/:id — עדכון רשימה (רק בעלים) */
export const updateList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = req.body as UpdateListInput;
  const list = await listService.updateList(req.params.id, req.user!.id, data);
  res.json({ success: true, data: list });
});

/** DELETE /api/lists/:id — מחיקת רשימה (רק בעלים) */
export const deleteList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { memberIds, listName } = await listService.deleteList(req.params.id, req.user!.id);
  res.json({
    success: true,
    message: 'List deleted successfully',
    data: { memberIds, listName },
  });
});

/** POST /api/lists/join — הצטרפות לקבוצה דרך inviteCode */
export const joinGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = req.body as JoinGroupInput;
  const list = await listService.joinGroup(req.user!.id, data);
  res.json({ success: true, data: list });
});

/** POST /api/lists/:id/leave — יציאה מקבוצה */
export const leaveGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  await listService.leaveGroup(req.params.id, req.user!.id);
  res.json({ success: true, message: 'Left group successfully' });
});

/** DELETE /api/lists/:id/members/:memberId — הסרת חבר (בעלים/אדמין) */
export const removeMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, memberId } = req.params;
  const list = await listService.removeMember(id, req.user!.id, memberId);
  res.json({ success: true, data: list });
});

/** POST /api/lists/:id/members/:memberId/toggle-admin — שינוי סטטוס אדמין (בעלים בלבד) */
export const toggleMemberAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, memberId } = req.params;
  const list = await listService.toggleMemberAdmin(id, req.user!.id, memberId);
  res.json({ success: true, data: list });
});
