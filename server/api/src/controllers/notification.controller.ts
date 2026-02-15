import type { Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { ForbiddenError } from '../errors';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';

export class NotificationController {
  /**
   * GET /notifications
   * Get all notifications for the authenticated user
   */
  static getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { page, limit, listId, unreadOnly } = req.query;

    const result = await NotificationService.getUserNotifications(userId, {
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
   * GET /notifications/unread-count
   * Get the count of unread notifications
   */
  static getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { listId } = req.query;

    const count = await NotificationService.getUnreadCount(
      userId,
      listId as string | undefined
    );

    res.json({
      success: true,
      data: { count },
    });
  });

  /**
   * PUT /notifications/:id/read
   * Mark a single notification as read
   */
  static markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const notification = await NotificationService.markAsRead(id, userId);

    res.json({
      success: true,
      data: notification,
    });
  });

  /**
   * PUT /notifications/read-all
   * Mark all notifications as read
   */
  static markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { listId } = req.body;

    const count = await NotificationService.markAllAsRead(userId, listId);

    res.json({
      success: true,
      data: { markedCount: count },
    });
  });

  /**
   * POST /notifications (internal use - for Socket server)
   * Create a notification
   */
  static createNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, listId, listName, actorId, actorName, targetUserId, productId, productName } = req.body;

    // Prevent impersonation: actorId must match the authenticated user
    if (String(actorId) !== req.user!.id) {
      throw new ForbiddenError('Cannot create notifications on behalf of another user');
    }

    const notification = await NotificationService.createNotification({
      type,
      listId,
      listName,
      actorId,
      actorName,
      targetUserId,
      productId,
      productName,
    });

    res.status(201).json({
      success: true,
      data: notification,
    });
  });

  /**
   * POST /notifications/broadcast (internal use - for Socket server)
   * Create notifications for all list members
   */
  static createNotificationsForListMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { listId, type, actorId, productId, productName } = req.body;

    // Prevent impersonation: actorId must match the authenticated user
    if (String(actorId) !== req.user!.id) {
      throw new ForbiddenError('Cannot broadcast notifications on behalf of another user');
    }

    const notifications = await NotificationService.createNotificationsForListMembers(
      listId,
      type,
      actorId,
      { productId, productName }
    );

    res.status(201).json({
      success: true,
      data: notifications,
    });
  });
}
