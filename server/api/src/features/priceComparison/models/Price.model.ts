import { Schema, model, type Document, Types } from 'mongoose';

export type ChainId = 'osher_ad' | 'shufersal' | 'rami_levy' | 'victory' | 'yenot_bitan';

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
