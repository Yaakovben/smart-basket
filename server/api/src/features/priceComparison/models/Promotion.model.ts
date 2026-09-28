import { Schema, model, type Document, Types } from 'mongoose';
import type { ChainId } from './Price.model';

/**
 * Promotion - מבצע של רשת, מקובצי PromoFull בפורטלי השקיפות.
 *
 * מסמך אחד לכל מבצע ולא לכל (סניף x מבצע): אותו מבצע חוזר בכל הסניפים, ושורה
 * לכל סניף הייתה ממלאת את מכסת Atlas. תקפות לסניף נשמרת בכל פריט כמפת ביטים לפי
 * סדר הסניפים של הסנכרון (ChainPriceCoverage.promoStoreIds). ראו services/promoAggregation.ts.
 *
 * קוראים רק מסמכים של הריצה הנוכחית (syncRunId = ChainPriceCoverage.promoSyncRunId):
 * מפות הביטים תלויות בסדר הסניפים של הריצה שכתבה אותן.
 */
export interface IPromotionItem {
  barcode: string;
  minQty: number;
  // מחיר כולל עבור minQty יחידות
  price: number;
  // מפת ביטים (base64) של הסניפים. חסר = כל הסניפים שסונכרנו
  stores?: string;
}

export interface IPromotionDoc extends Document {
  _id: Types.ObjectId;
  chainId: ChainId;
  promotionId: string;
  // מזהה המבצע + תקציר הפרטים הכלליים. ייחודי בתוך הרשת
  variantKey: string;
  description: string;
  startDate?: Date;
  endDate?: Date;
  clubOnly: boolean;
  minPurchaseAmount?: number;
  items: IPromotionItem[];
  // מזהה ריצת הסנכרון שכתבה את המסמך
  syncRunId: string;
  source: string;
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<IPromotionItem>(
  {
    barcode: { type: String, required: true },
    minQty: { type: Number, required: true },
    price: { type: Number, required: true, min: 0 },
    stores: { type: String },
  },
  { _id: false }
);

const promotionSchema = new Schema<IPromotionDoc>(
  {
    chainId: { type: String, required: true },
    promotionId: { type: String, required: true },
    variantKey: { type: String, required: true },
    description: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    clubOnly: { type: Boolean, default: false },
    minPurchaseAmount: { type: Number },
    items: { type: [itemSchema], default: [] },
    syncRunId: { type: String, required: true },
    source: { type: String, required: true },
    fetchedAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    collection: 'promotions',
    toJSON: {
      transform: (_, ret) => {
        const { _id, __v, ...rest } = ret;
        return { ...rest, id: _id.toString() };
      },
    },
  }
);

// ייחודיות: מבצע אחד לכל (רשת, ריצה, מפתח). הריצה בתוך המפתח כי בזמן ההחלפה
// קיימות יחד הגרסה הקודמת (שעדיין נקראת) והחדשה (שנכתבת)
promotionSchema.index({ chainId: 1, syncRunId: 1, variantKey: 1 }, { unique: true });
// מבצעים לפי ברקוד (השוואת מוצר וסל)
promotionSchema.index({ 'items.barcode': 1 });

export const Promotion = model<IPromotionDoc>('Promotion', promotionSchema);
