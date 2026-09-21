import { Schema, model, type Document, Types } from 'mongoose';

/**
 * PriceMatchOverride — תיקון ידני של משתמש להתאמת מוצר.
 *
 * ההתאמה האוטומטית נעשית לפי דמיון שם ולעיתים טועה ("חלב" → "שוקולד חלב").
 * כשהמשתמש בוחר את המוצר הנכון (ברקוד) או מסמן "אין התאמה", התיקון נשמר לפי
 * שם מנורמל ומוחל על כל הרשתות ועל כל הרשימות של אותו משתמש.
 */
export interface IPriceMatchOverrideDoc extends Document {
  _id: Types.ObjectId;
  userId: string;
  // שם המוצר של המשתמש אחרי normalizeProductName - מפתח ההתאמה
  key: string;
  // השם כפי שהמשתמש כתב, לתצוגה בלבד
  productName: string;
  // הברקוד שנבחר. חסר כש-excluded=true.
  barcode?: string;
  // true = המשתמש קבע שאין התאמה נכונה - לא להציג מחיר למוצר הזה
  excluded: boolean;
  updatedAt: Date;
  createdAt: Date;
}

const priceMatchOverrideSchema = new Schema<IPriceMatchOverrideDoc>(
  {
    userId: { type: String, required: true },
    key: { type: String, required: true, maxlength: 200 },
    productName: { type: String, required: true, maxlength: 200 },
    barcode: { type: String, maxlength: 40 },
    excluded: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'price_match_overrides' }
);

// תיקון אחד לכל (משתמש, שם מוצר). משמש גם לשליפת כל התיקונים של משתמש.
priceMatchOverrideSchema.index({ userId: 1, key: 1 }, { unique: true });

export const PriceMatchOverride = model<IPriceMatchOverrideDoc>('PriceMatchOverride', priceMatchOverrideSchema);
