import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';
import type { NotificationType } from '../types';

// Member subdocument interface
export interface IMember {
  user: Types.ObjectId;
  isAdmin: boolean;
  joinedAt: Date;
}

// Notification subdocument interface (legacy - kept for backward compatibility)
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
  inviteCode?: string;
  password?: string; // Plaintext password (4 chars)
  notifications: INotification[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

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
    inviteCode: {
      type: String,
      sparse: true,
      unique: true,
    },
    password: {
      type: String,
      // Simple 4-character password stored as plaintext
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

// Compare password method
// Handles both legacy bcrypt hashed passwords and new plaintext passwords
listSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return true; // No password set = no protection

  // Legacy: hashed passwords start with $2b$
  if (this.password.startsWith('$2b$')) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // New: simple plaintext comparison
  return this.password === candidatePassword;
};

export const List = mongoose.model<IList>('List', listSchema);
