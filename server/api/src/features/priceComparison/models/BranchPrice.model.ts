import { Schema, model, type Document, Types } from 'mongoose';
import type { ChainId } from './Price.model';

/**
 * BranchPrice — מחיר מוצר בסניף ספציפי (לא אגרגציה ברמת הרשת).
 *
 * Price.model שומר שורה אחת לכל (barcode, chainId) עם המחיר הזול ביותר
 * מבין כל הסניפים — טוב להשוואה "מה הכי זול ברשת הזו", אבל לא משקף את
 * מה שהלקוח באמת ישלם בסניף הקרוב אליו (שיכול להיות יקר יותר מהסניף הזול
 * שנמצא אי-שם בארץ). הקולקציה הזו שומרת מחיר בפועל לכל סניף, כדי שהצגת
 * מחיר לפי "הסניף הקרוב אליי" תהיה מדויקת ולא תסתור מה שהלקוח רואה בפועל
 * בחנות.
 */
export interface IBranchPriceDoc extends Document {
  _id: Types.ObjectId;
  chainId: ChainId;
  storeId: string;
  barcode: string;
  price: number;
  updatedAt: Date;
  createdAt: Date;
}

const branchPriceSchema = new Schema<IBranchPriceDoc>(
  {
    chainId: { type: String, required: true, index: true },
    storeId: { type: String, required: true },
    barcode: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
    collection: 'branch_prices',
    toJSON: {
      transform: (_, ret) => {
        const { _id, __v, ...rest } = ret;
        return { ...rest, id: _id.toString() };
      },
    },
  }
);

// ייחודיות: מחיר אחד לכל (סניף, ברקוד)
branchPriceSchema.index({ chainId: 1, storeId: 1, barcode: 1 }, { unique: true });

export const BranchPrice = model<IBranchPriceDoc>('BranchPrice', branchPriceSchema);
