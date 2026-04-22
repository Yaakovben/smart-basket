/**
 * notification.service.ts
 *
 * ניהול התראות (in-app + Push).
 * מייצר התראות לרשימות בודדות / לכל חברי הקבוצה.
 * מכבד השתקות משתמש (muted groups), למעט אירועים קריטיים (מחיקה, הסרה).
 */

import mongoose from 'mongoose';
import { NotificationDAL, ListDAL, UserDAL } from '../dal';
import { NotFoundError } from '../errors';
import { logger } from '../config';
import type { INotificationDoc, NotificationType } from '../models';
import { sendToUser, sendToUsers } from './push.service';

const PUSH_ICON = '/icon-192x192.png';
const RLM = '‏'; // סימן RTL לתצוגה תקינה בעברית ב-push notifications

export interface CreateNotificationInput {
  type: NotificationType;
  listId: string;
  listName: string;
  actorId: string;
  actorName: string;
  targetUserId: string;
  productId?: string;
  productName?: string;
}

export interface GetNotificationsOptions {
  page?: number;
  limit?: number;
  listId?: string;
  unreadOnly?: boolean;
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  listId: string;
  listName: string;
  actorId: string;
  actorName: string;
  productId?: string;
  productName?: string;
  read: boolean;
  createdAt: Date;
}

export interface PaginatedNotifications {
  notifications: NotificationResponse[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

// ==================== עזר פנימי ====================

// מייצר כותרת+גוף ל-push בעברית עם שם ראשון בלבד (קיצור).
const generatePushMessage = (
  type: NotificationType,
  actorName: string,
  listName: string,
  productName?: string,
): { title: string; body: string } => {
  const firstName = actorName.split(' ')[0];

  const getAction = (): string => {
    switch (type) {
      case 'join':            return `${firstName} הצטרף/ה לקבוצה`;
      case 'leave':           return `${firstName} עזב/ה את הקבוצה`;
      case 'removed':         return `${firstName} הוסר/ה מהקבוצה`;
      case 'member_removed':  return `הוסרת מהקבוצה על ידי ${firstName}`;
      case 'list_deleted':    return `${firstName} מחק/ה את הקבוצה`;
      case 'product_add':     return `${firstName} הוסיף/ה "${productName}"`;
      case 'product_update':  return `${firstName} עדכן/ה "${productName}"`;
      case 'product_delete':  return `${firstName} מחק/ה "${productName}"`;
      case 'product_purchase':   return `${firstName} סימן/ה "${productName}" כנקנה`;
      case 'product_unpurchase': return `${firstName} החזיר/ה "${productName}" לרשימה`;
      case 'list_clear':      return `${firstName} ניקה/תה את הרשימה`;
      case 'list_update': {
        // productName מקודד שינוי ושם חדש אופציונלי כ-"changeType:newName"
        const [changeType, newName] = productName?.includes(':')
          ? [productName.split(':')[0], productName.split(':').slice(1).join(':')]
          : [productName, undefined];
        if (changeType === 'name' && newName) return `${firstName} שינה/תה את שם הרשימה ל-"${newName}"`;
        if (changeType === 'design')          return `${firstName} שינה/תה את עיצוב הרשימה`;
        if (changeType === 'both' && newName) return `${firstName} עדכן/ה את הרשימה ל-"${newName}"`;
        return `${firstName} עדכן/ה את הרשימה`;
      }
      default: return 'פעילות חדשה';
    }
  };

  // כותרת: אמוג׳י + שם רשימה. גוף: הפעולה.
  return {
    title: `📋 ${RLM}${listName}`,
    body: `${RLM}${getAction()}`,
  };
};

// המרת Document ל-response לצד הלקוח (חושף רק את השדות הרלוונטיים).
const transformNotification = (notification: INotificationDoc): NotificationResponse => {
  const json = notification.toJSON() as Record<string, unknown>;
  return {
    id: json.id as string,
    type: json.type as NotificationType,
    listId: (json.listId as { toString: () => string }).toString(),
    listName: json.listName as string,
    actorId: (json.actorId as { toString: () => string }).toString(),
    actorName: json.actorName as string,
    productId: json.productId ? (json.productId as { toString: () => string }).toString() : undefined,
    productName: json.productName as string | undefined,
    read: json.read as boolean,
    createdAt: json.createdAt as Date,
  };
};

// ==================== יצירה ====================

/**
 * יצירת התראה יחידה למשתמש ספציפי + שליחת push ברקע.
 * שגיאת push לא שוברת את הפונקציה - רק נרשמת ללוג.
 */
export async function createNotification(
  data: CreateNotificationInput
): Promise<NotificationResponse> {
  const notification = await NotificationDAL.createNotification({
    type: data.type,
    listId: data.listId,
    listName: data.listName,
    actorId: data.actorId,
    actorName: data.actorName,
    targetUserId: data.targetUserId,
    productId: data.productId,
    productName: data.productName,
  });

  // Push ברקע - לא חוסם את התגובה
  const pushMessage = generatePushMessage(data.type, data.actorName, data.listName, data.productName);
  sendToUser(data.targetUserId, {
    ...pushMessage,
    icon: PUSH_ICON,
    badge: PUSH_ICON,
    data: {
      listId: data.listId,
      type: data.type,
      url: `/list/${data.listId}`,
      notificationId: notification.id,
    },
  }).catch(err => logger.warn('Push notification failed:', err));

  return transformNotification(notification);
}

/**
 * יצירת התראות לכל חברי הרשימה (חוץ מהמבצע ומ-excludeUserId אם סופק).
 * מסנן משתמשים שהשתיקו את הקבוצה - למעט אירועים קריטיים (list_deleted/removed/member_removed).
 */
export async function createNotificationsForListMembers(
  listId: string,
  type: NotificationType,
  actorId: string,
  data: {
    productId?: string;
    productName?: string;
    excludeUserId?: string;
  } = {}
): Promise<NotificationResponse[]> {
  // שאילתות מקבילות במקום סדרתיות
  const [list, actor] = await Promise.all([
    ListDAL.findById(listId),
    UserDAL.findById(actorId),
  ]);
  if (!list) throw NotFoundError.list();
  if (!actor) throw NotFoundError.user();

  const excludeIds = new Set([actorId]);
  if (data.excludeUserId) excludeIds.add(data.excludeUserId);

  const targetUserIds: string[] = [];
  if (!excludeIds.has(list.owner.toString())) targetUserIds.push(list.owner.toString());
  for (const member of list.members) {
    if (!excludeIds.has(member.user.toString())) targetUserIds.push(member.user.toString());
  }
  if (targetUserIds.length === 0) return [];

  // סינון משתמשים שהשתיקו את הקבוצה - אירועים קריטיים נשלחים תמיד
  const criticalTypes: NotificationType[] = ['list_deleted', 'removed', 'member_removed'];
  let activeTargetIds = targetUserIds;
  if (!criticalTypes.includes(type)) {
    const mutedUserIds = await UserDAL.findUserIdsWhoMutedGroup(listId, targetUserIds);
    const mutedSet = new Set(mutedUserIds);
    activeTargetIds = targetUserIds.filter(id => !mutedSet.has(id));
    if (activeTargetIds.length === 0) return [];
  }

  const notificationsData = activeTargetIds.map(targetUserId => ({
    type,
    listId,
    listName: list.name,
    actorId,
    actorName: actor.name,
    targetUserId,
    productId: data.productId,
    productName: data.productName,
  }));

  const notifications = await NotificationDAL.createMany(notificationsData);

  // Push לכל המקבלים במקביל, עם eventId משותף למניעת כפילות
  const pushMessage = generatePushMessage(type, actor.name, list.name, data.productName);
  const eventId = new mongoose.Types.ObjectId().toString();
  sendToUsers(activeTargetIds, {
    ...pushMessage,
    icon: PUSH_ICON,
    badge: PUSH_ICON,
    data: { listId, type, url: `/list/${listId}`, notificationId: eventId },
  }).catch(err => logger.warn('Push notification failed:', err));

  return notifications.map(transformNotification);
}

// ==================== קריאה ====================

/** שליפת התראות משתמש עם pagination. */
export async function getUserNotifications(
  userId: string,
  options: GetNotificationsOptions = {}
): Promise<PaginatedNotifications> {
  const { page = 1, limit: rawLimit = 50, listId, unreadOnly = false } = options;
  const limit = Math.min(rawLimit, 100);

  const result = await NotificationDAL.findByUser(userId, { page, limit, listId, unreadOnly });

  return {
    notifications: result.notifications.map(transformNotification),
    pagination: { total: result.total, page, limit, pages: result.pages },
  };
}

/** ספירת התראות לא-נקראות (אופציונלית לפי listId). */
export async function getUnreadCount(userId: string, listId?: string): Promise<number> {
  return NotificationDAL.countUnread(userId, listId);
}

/** סימון התראה יחידה כנקראה - דורש בעלות (targetUserId = userId). */
export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<NotificationResponse> {
  const notification = await NotificationDAL.findOne({
    _id: new mongoose.Types.ObjectId(notificationId),
    targetUserId: new mongoose.Types.ObjectId(userId),
  });
  if (!notification) throw NotFoundError.notification();

  notification.read = true;
  await notification.save();
  return transformNotification(notification);
}

/** סימון כל ההתראות של המשתמש כנקראות (או של רשימה ספציפית). */
export async function markAllAsRead(userId: string, listId?: string): Promise<number> {
  return NotificationDAL.markAllAsRead(userId, listId);
}

// ==================== ניקוי ====================

/** מחיקת כל ההתראות של רשימה (למשל כשהרשימה נמחקת). */
export async function deleteNotificationsForList(listId: string): Promise<number> {
  return NotificationDAL.deleteByListId(listId);
}

/** מחיקה ידנית של התראות ישנות. TTL אינדקס עושה את זה אוטומטית. */
export async function deleteOldNotifications(days: number): Promise<number> {
  return NotificationDAL.deleteOldNotifications(days);
}
