import mongoose, { Schema, Document, Types } from 'mongoose';
import { PRODUCT_UNITS, PRODUCT_CATEGORIES, DEFAULT_UNIT, DEFAULT_CATEGORY } from '../constants';
import type { ProductUnit, ProductCategory } from '../constants';

export interface IProductDoc extends Document {
  _id: Types.ObjectId;
  listId: Types.ObjectId;
  name: string;
  quantity: number;
  unit: ProductUnit;
  category: ProductCategory;
  isPurchased: boolean;
  addedBy: Types.ObjectId;
  // מי ערך לאחרונה שדה תוכן (שם/כמות/יחידה/קטגוריה/הערה) - לא כולל סימון קנייה,
  // שיש לו ייחוס נפרד (purchasedBy). null אם מעולם לא נערך אחרי היצירה.
  updatedBy?: Types.ObjectId | null;
  // מי סימן את המוצר כ"נקנה" לאחרונה. מתאפס ל-null כשמסמנים "לא נקנה" -
  // אין טעם ב"מי קנה" למוצר שכרגע לא מסומן כנקנה.
  purchasedBy?: Types.ObjectId | null;
  position: number;
  note?: string;
  // מזהה זמני מהלקוח (temp id) - idempotency key להוספת מוצר. אופציונלי כי
  // רק בקשות דרך תור ה-offline sync שולחות אותו; שאר הנתיבים (undo וכו') לא.
  clientId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProductDoc>(
  {
    listId: {
      type: Schema.Types.ObjectId,
      ref: 'List',
      required: true,
    },
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
      max: 99999,
      default: 1,
    },
    unit: {
      type: String,
      enum: [...PRODUCT_UNITS],
      default: DEFAULT_UNIT,
    },
    category: {
      type: String,
      enum: [...PRODUCT_CATEGORIES],
      default: DEFAULT_CATEGORY,
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
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    purchasedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    position: {
      type: Number,
      default: 0,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    clientId: {
      type: String,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        const { _id, __v, listId, ...rest } = ret;
        return { ...rest, id: _id.toString() };
      },
    },
  }
);

// אינדקס מורכב לשאילתות רשימה יעילות עם מיון
productSchema.index({ listId: 1, position: 1 });
productSchema.index({ listId: 1, isPurchased: 1 });
productSchema.index({ addedBy: 1 });

// idempotency: ייחודי רק בין מסמכים שבהם clientId קיים בפועל (sparse) - כך
// שהוספות בלי clientId (רוב הנתיבים) לא מתנגשות. תופס race אמיתי (שני
// טאבים/ניסיונות חוזרים בו-זמנית עם אותו clientId) שבדיקת "קיים?" לפני
// היצירה בקוד השירות לבדה לא הייתה תופסת.
productSchema.index({ listId: 1, clientId: 1 }, { unique: true, sparse: true });

export const Product = mongoose.model<IProductDoc>('Product', productSchema);
