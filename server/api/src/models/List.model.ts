import mongoose, { Schema, Document, Types } from 'mongoose';
import type { ProductUnit, ProductCategory, NotificationType } from '../types';

// Product subdocument interface
export interface IProduct {
  _id: Types.ObjectId;
  name: string;
  quantity: number;
  unit: ProductUnit;
  category: ProductCategory;
  isPurchased: boolean;
  addedBy: Types.ObjectId;
  createdAt: Date;
}

// Member subdocument interface
export interface IMember {
  user: Types.ObjectId;
  isAdmin: boolean;
  joinedAt: Date;
}

// Notification subdocument interface
export interface INotification {
  _id: Types.ObjectId;
  type: NotificationType;
  userId: Types.ObjectId;
  userName: string;
  timestamp: Date;
  read: boolean;
}

// List document interface
export interface IList extends Document {
  _id: Types.ObjectId;
  name: string;
  icon: string;
  color: string;
  isGroup: boolean;
  owner: Types.ObjectId;
  members: IMember[];
  products: IProduct[];
  inviteCode?: string;
  password?: string;
  notifications: INotification[];
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    unit: {
      type: String,
      enum: ['יח׳', 'ק״ג', 'גרם', 'ליטר'],
      default: 'יח׳',
    },
    category: {
      type: String,
      enum: [
        'מוצרי חלב',
        'מאפים',
        'ירקות',
        'פירות',
        'בשר',
        'משקאות',
        'ממתקים',
        'ניקיון',
        'אחר',
      ],
      default: 'אחר',
    },
    isPurchased: {
      type: Boolean,
      default: false,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        const { _id, ...rest } = ret;
        return { ...rest, id: _id.toString() };
      },
    },
  }
);

const memberSchema = new Schema<IMember>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const notificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: ['join', 'leave', 'removed'],
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: {
      transform: (_, ret) => {
        const { _id, ...rest } = ret;
        return { ...rest, id: _id.toString() };
      },
    },
  }
);

const listSchema = new Schema<IList>(
  {
    name: {
      type: String,
      required: [true, 'List name is required'],
      trim: true,
      minlength: [2, 'List name must be at least 2 characters'],
      maxlength: [50, 'List name cannot exceed 50 characters'],
    },
    icon: {
      type: String,
      default: '🛒',
    },
    color: {
      type: String,
      default: '#14B8A6',
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [memberSchema],
    products: [productSchema],
    inviteCode: {
      type: String,
      sparse: true,
      unique: true,
    },
    password: {
      type: String,
      minlength: 4,
      maxlength: 4,
    },
    notifications: [notificationSchema],
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

// Indexes (inviteCode index created by unique: true in schema)
listSchema.index({ owner: 1 });
listSchema.index({ 'members.user': 1 });

export const List = mongoose.model<IList>('List', listSchema);
