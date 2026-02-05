import Joi from 'joi';
import { commonSchemas } from './common.validator';

const notificationTypes = [
  'join',
  'leave',
  'removed',
  'product_add',
  'product_update',
  'product_delete',
  'product_purchase',
  'member_removed',
  'list_deleted',
  'list_update',
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
    type: Joi.string()
      .valid(...notificationTypes)
      .required(),
    actorId: commonSchemas.objectId.required(),
    productId: commonSchemas.objectId,
    productName: Joi.string(),
  }),
};

// Type exports
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
