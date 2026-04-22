/**
 * user.controller.ts
 *
 * Controller של המשתמש המחובר: פרופיל, סיסמה, השתקות, סדר רשימות, מחיקת חשבון.
 * מותקן ב-/api/users.
 *
 * כל הנתיבים כאן דורשים אימות (JWT תקף).
 */

import type { Response } from 'express';
import type { AuthRequest } from '../types';
import type { UpdateProfileInput, ChangePasswordInput } from '../validators';
import { asyncHandler } from '../utils';
import { UserDAL } from '../dal';
import {
  getProfile as fetchProfile,
  updateProfile as persistProfile,
  changePassword as updatePassword,
  toggleMutedGroup,
  deleteAccount,
} from '../services/user.service';

/**
 * GET /api/users/me
 * מחזיר את פרטי המשתמש המחובר.
 */
export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await fetchProfile(req.user!.id);
  res.json({ success: true, data: user });
});

/**
 * PUT /api/users/me
 * עדכון פרופיל (שם/מייל/אמוג׳י).
 */
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = req.body as UpdateProfileInput;
  const user = await persistProfile(req.user!.id, data);
  res.json({ success: true, data: user });
});

/**
 * POST /api/users/me/password
 * שינוי סיסמה.
 * דורש currentPassword + newPassword. מבטל טוקנים בכל המכשירים בהצלחה.
 */
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = req.body as ChangePasswordInput;
  await updatePassword(req.user!.id, data.currentPassword, data.newPassword);
  res.json({ success: true, message: 'Password changed successfully' });
});

/**
 * POST /api/users/me/mute-group
 * הוספה/הסרה של קבוצה מרשימת ההשתקה. מחזיר את הרשימה המעודכנת.
 */
export const toggleMuteGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { groupId } = req.body as { groupId: string };
  const mutedGroupIds = await toggleMutedGroup(req.user!.id, groupId);
  res.json({ success: true, data: { mutedGroupIds } });
});

/**
 * PUT /api/users/me/list-order
 * שמירת סדר הרשימות של המשתמש.
 */
export const updateListOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listOrder } = req.body as { listOrder: string[] };
  await UserDAL.updateListOrder(req.user!.id, listOrder);
  res.json({ success: true, data: { listOrder } });
});

/**
 * DELETE /api/users/me
 * מחיקת חשבון מלאה (כולל רשימות פרטיות, התראות, push subscriptions).
 */
export const deleteMyAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  await deleteAccount(req.user!.id);
  res.json({ success: true, message: 'Account deleted successfully' });
});
