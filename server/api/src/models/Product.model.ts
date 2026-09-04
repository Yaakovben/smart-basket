import mongoose, { Schema, Document, Types } from 'mongoose';
import { PRODUCT_UNITS, PRODUCT_CATEGORIES, DEFAULT_UNIT, DEFAULT_CATEGORY } from '../constants';
import type { ProductUnit, ProductCategory } from '../constants';

// מספר רשומות editHistory מקסימלי שנשמר - הישנות ביותר נחתכות (ראו
// product.service.ts:updateProduct). מונע גדילה בלתי מוגבלת של המסמך
// על מוצר שנערך עשרות פעמים; 10 העריכות האחרונות מספיקות להצגה בפרטי מוצר.
export const MAX_EDIT_HISTORY = 10;

// שינוי שדה בודד בתוך עריכה אחת (יכולה לכלול כמה שדות בבת אחת - למשל שם
// וכמות באותה שמירה). oldValue/newValue כ-Mixed כי quantity הוא מספר
// ושאר השדות מחרוזות.
export interface IProductEditChange {
  field: 'name' | 'quantity' | 'unit' | 'category' | 'note';
  oldValue: unknown;
  newValue: unknown;
}

export interface IProductEditEntry {
  editedBy: Types.ObjectId;
  editedAt: Date;
  changes: IProductEditChange[];
}

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
  // לוג עריכות תוכן - כל עריכה (שמירה אחת בעורך) כרשומה נפרדת עם כל השדות
  // שהשתנו בה יחד (לא שדה בודד לרשומה - כך "שיניתי שם וכמות באותה שמירה"
  // מוצג כאירוע אחד, לא שניים). מוגבל ל-MAX_EDIT_HISTORY האחרונים כדי
  // שהמסמך לא יגדל ללא הגבלה על מוצר שנערך עשרות פעמים.
  editHistory?: IProductEditEntry[];
  position: number;
  note?: string;
  // תמונת מוצר שהמשתמש צילם/העלה. או כתובת URL (Cloudinary וכו') או
  // data URL (data:image/...;base64,...) כשאין אחסון חיצוני מוגדר. ריק =
  // אין תמונה, והלקוח נופל לאריח הקטגוריה כרגיל. ה-maxlength מכסה גם
  // data URL של תמונה דחוסה (~200-400KB אחרי base64).
  image?: string;
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
    editHistory: {
      type: [
        {
          _id: false,
          editedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          editedAt: { type: Date, required: true },
          changes: {
            type: [
              {
                _id: false,
                field: { type: String, enum: ['name', 'quantity', 'unit', 'category', 'note'], required: true },
                oldValue: { type: Schema.Types.Mixed },
                newValue: { type: Schema.Types.Mixed },
              },
            ],
            required: true,
          },
        },
      ],
      default: undefined,
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
    image: {
      type: String,
      maxlength: 500000,
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
