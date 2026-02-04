import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType =
  | 'join'
  | 'leave'
  | 'removed'  // When a member is removed by admin (different from 'leave' which is voluntary)
  | 'product_add'
  | 'product_update'
  | 'product_delete'
  | 'product_purchase'
  | 'member_removed'
  | 'list_deleted'
  | 'list_update';  // When list name/settings are changed

export interface INotification extends Document {
  _id: Types.ObjectId;
  type: NotificationType;
  listId: Types.ObjectId;
  listName: string;
  actorId: Types.ObjectId;
  actorName: string;
  targetUserId: Types.ObjectId;
  productId?: Types.ObjectId;
  productName?: string;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: ['join', 'leave', 'removed', 'product_add', 'product_update', 'product_delete', 'product_purchase', 'member_removed', 'list_deleted', 'list_update'],
      required: true,
    },
    listId: {
      type: Schema.Types.ObjectId,
      ref: 'List',
      required: true,
    },
    listName: {
      type: String,
      required: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    productName: {
      type: String,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        const { _id, __v, ...rest } = ret;
        return { ...rest, id: _id.toString() };
      },
    },
  }
);

// Indexes for efficient querying
notificationSchema.index({ targetUserId: 1, createdAt: -1 });
notificationSchema.index({ targetUserId: 1, read: 1 });
notificationSchema.index({ listId: 1 });
notificationSchema.index({ createdAt: -1 });

// TTL index - auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
