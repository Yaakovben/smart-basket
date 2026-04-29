import { Schema, model, type Document, Types } from 'mongoose';

export type ChainId =
  | 'osher_ad'
  | 'shufersal'
  | 'rami_levy'
  | 'yohananof'
  | 'tiv_taam'
  | 'keshet'
  | 'stop_market'
  | 'politzer'
  | 'doralon'
  | 'victory';

export interface IPriceDoc extends Document {
  _id: Types.ObjectId;
  barcode: string;
  itemName: string;
  itemNameNormalized: string;
  chainId: ChainId;
  chainName: string;
  storeId?: string;
  price: number;
  unitOfMeasure?: string;
  manufacturerName?: string;
  quantity?: number;
  // שדות עשירים נוספים מהפורטל הממשלתי
  manufactureCountry?: string;          // ארץ ייצור
  manufacturerItemDescription?: string; // תיאור היצרן הנקי
  qtyInPackage?: number;                // כמות יחידות באריזה
  isWeighted?: boolean;                 // מוצר במשקל (kg)
  unitQty?: string;                     // יחידת בסיס
  itemPriceUpdateDate?: Date;           // עדכון מחיר אחרון אצל הרשת
  // שדות סטטוס/דגלים נוספים
  itemType?: number;                    // 1=ברקוד, 2=שקילה, 3=פנימי
  itemId?: string;                      // מזהה פנימי של הרשת
  allowDiscount?: boolean;
  blockedItem?: boolean;                // מוצר חסום - סינון בתצוגה
  itemStatus?: string;
  bikoretNo?: string;                   // תעודת כשרות
  unitOfMeasurePrice?: number;          // מחיר ל-100גרם / 100מ"ל - להשוואה כמותית
  updatedAt: Date;
  createdAt: Date;
}

const priceSchema = new Schema<IPriceDoc>(
  {
    barcode: { type: String, required: true, index: true },
    itemName: { type: String, required: true },
    itemNameNormalized: { type: String, required: true, index: true },
    chainId: { type: String, required: true, index: true },
    chainName: { type: String, required: true },
    storeId: { type: String },
    price: { type: Number, required: true, min: 0 },
    unitOfMeasure: { type: String },
    manufacturerName: { type: String },
    quantity: { type: Number },
    manufactureCountry: { type: String },
    manufacturerItemDescription: { type: String },
    qtyInPackage: { type: Number },
    isWeighted: { type: Boolean },
    unitQty: { type: String },
    itemPriceUpdateDate: { type: Date },
    itemType: { type: Number },
    itemId: { type: String },
    allowDiscount: { type: Boolean },
    blockedItem: { type: Boolean },
    itemStatus: { type: String },
    bikoretNo: { type: String },
    unitOfMeasurePrice: { type: Number },
  },
  {
    timestamps: true,
    collection: 'prices',
    toJSON: {
      transform: (_, ret) => {
        const { _id, __v, ...rest } = ret;
        return { ...rest, id: _id.toString() };
      },
    },
  }
);

// אינדקס מורכב: ברקוד + רשת = ייחודי (מחיר אחד לכל ברקוד לכל רשת)
priceSchema.index({ barcode: 1, chainId: 1 }, { unique: true });
priceSchema.index({ itemNameNormalized: 'text' });

export const Price = model<IPriceDoc>('Price', priceSchema);
