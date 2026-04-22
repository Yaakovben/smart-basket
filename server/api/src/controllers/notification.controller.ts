/**
 * notification.controller.ts
 *
 * Controller של התראות:
 * - שליפה עם pagination + סינון (listId / unreadOnly)
 * - ספירת לא-נקראות
 * - סימון אחת/כולן כנקראות
 * - נתיבים פנימיים ליצירת התראה (משמש ע״י שרת ה-Socket)
 *
 * מותקן ב-/api/notifications. כל הנתיבים דורשים אימות.
 */

import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { asyncHandler, sanitizeText } from '../utils';
import { ForbiddenError } from '../errors';
import { ListDAL } from '../dal';
import * as notificationService from '../services/notification.service';

/**
 * GET /api/notifications
 * רשימת התראות של המשתמש עם pagination. query: ?page=1&limit=50&listId=&unreadOnly=true
 */
export const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { page, limit, listId, unreadOnly } = req.query;

  const result = await notificationService.getUserNotifications(userId, {
    page: page ? parseInt(page as string, 10) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    listId: listId as string | undefined,
    unreadOnly: unreadOnly === 'true',
  });

  res.json({
    success: true,
    data: result.notifications,
    pagination: result.pagination,
  });
});

/**
 * GET /api/notifications/unread-count
 * ספירת התראות לא-נקראות (אופציונלית לפי listId).
 */
export const getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { listId } = req.query;
  const count = await notificationService.getUnreadCount(userId, listId as string | undefined);
  res.json({ success: true, data: { count } });
});

/**
 * PUT /api/notifications/:id/read
 * סימון התראה יחידה כנקראה (דורש בעלות על ההתראה).
 */
export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const notification = await notificationService.markAsRead(id, userId);
  res.json({ success: true, data: notification });
});

/**
 * PUT /api/notifications/read-all
 * סימון כל ההתראות של המשתמש כנקראות (או של רשימה ספציפית). body: { listId? }
 */
export const markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { listId } = req.body;
  const count = await notificationService.markAllAsRead(userId, listId);
  res.json({ success: true, data: { markedCount: count } });
});

/**
 * POST /api/notifications
 * יצירת התראה יחידה למשתמש ספציפי (נתיב פנימי לשרת Socket).
 * מניעת התחזות: actorId חייב להתאים ל-req.user.id.
 */
export const createNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type, listId, listName, actorId, actorName, targetUserId, productId, productName } = req.body;

  if (String(actorId) !== req.user!.id) throw ForbiddenError.impersonation();

  const notification = await notificationService.createNotification({
    type,
    listId,
    listName: sanitizeText(listName),
    actorId,
    actorName: sanitizeText(actorName),
    targetUserId,
    productId,
    productName: productName ? sanitizeText(productName) : undefined,
  });

  res.status(201).json({ success: true, data: notification });
});

/**
 * POST /api/notifications/broadcast
 * יצירת התראות לכל חברי רשימה (נתיב פנימי לשרת Socket).
 * מניעת התחזות: actorId חייב להתאים ל-req.user.id + אימות חברות ברשימה.
 */
export const createNotificationsForListMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId, type, actorId, productId, productName } = req.body;

  if (String(actorId) !== req.user!.id) throw ForbiddenError.impersonation();

  // אימות שהמשתמש באמת חבר ברשימה
  const isMember = await ListDAL.isMember(listId, req.user!.id);
  if (!isMember) throw ForbiddenError.notMember();

  const notifications = await notificationService.createNotificationsForListMembers(
    listId,
    type,
    actorId,
    { productId, productName: productName ? sanitizeText(productName) : undefined }
  );

  res.status(201).json({ success: true, data: notifications });
});
