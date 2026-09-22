import Joi from 'joi';
import { commonSchemas } from './common.validator';

const notificationTypes = [
  'join',
  'leave',
  'removed',
  'product_add',
  'product_update',
  'product_photo_add',
  'product_photo_remove',
  'product_delete',
  'product_purchase',
  'product_unpurchase',
  'member_removed',
  'list_deleted',
  'list_update',
  'list_clear',
  'products_reorder',
] as const;

export const notificationValidator = {
  getAll: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    listId: commonSchemas.objectId,
    unreadOnly: Joi.boolean().default(false),
  }),

  params: Joi.object({
    id: commonSchemas.objectId.required(),
  }),

  markAllRead: Joi.object({
    listId: commonSchemas.objectId,
  }),

  create: Joi.object({
    type: Joi.string()
      .valid(...notificationTypes)
      .required(),
    listId: commonSchemas.objectId.required(),
    listName: Joi.string().min(1).required(),
    actorId: commonSchemas.objectId.required(),
    actorName: Joi.string().min(1).required(),
    targetUserId: commonSchemas.objectId.required(),
    productId: commonSchemas.objectId,
    productName: Joi.string(),
  }),

  broadcast: Joi.object({
    listId: commonSchemas.objectId.required(),
    // member_removed/list_deleted/removed מוחרגים בכוונה: אלה "אירועים
    // קריטיים" היחידים שעוקפים את סינון ה-mute (ראה notification.service.ts,
    // createNotificationsForListMembers). הם נוצרים אך ורק מקוד השרת עצמו
    // (list.service.ts/list-membership.service.ts) כשהאירוע באמת קרה - לא
    // דרך ה-endpoint הציבורי הזה. בלעדי ההחרגה, כל חבר ברשימה יכול היה
    // לקרוא ל-/broadcast ישירות עם type='list_deleted' ולשלוח push מפחיד
    // ושקרי לכל חברי הקבוצה, כולל למי שהשתיק אותה.
    type: Joi.string()
      .valid(...notificationTypes.filter(t => !['member_removed', 'list_deleted', 'removed'].includes(t)))
      .required(),
    actorId: commonSchemas.objectId.required(),
    productId: commonSchemas.objectId,
    productName: Joi.string(),
  }),
};

// ייצוא טיפוסים
export type NotificationType = (typeof notificationTypes)[number];

export type GetNotificationsQuery = {
  page?: number;
  limit?: number;
  listId?: string;
  unreadOnly?: boolean;
};

export type CreateNotificationInput = {
  type: NotificationType;
  listId: string;
  listName: string;
  actorId: string;
  actorName: string;
  targetUserId: string;
  productId?: string;
  productName?: string;
};

export type BroadcastNotificationInput = {
  listId: string;
  type: NotificationType;
  actorId: string;
  productId?: string;
  productName?: string;
};
