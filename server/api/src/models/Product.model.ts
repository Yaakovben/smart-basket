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
  position: number;
  note?: string;
  // ברקוד אופציונלי - כאשר מסומן, השוואת המחירים מזהה את המוצר ב-100%
  // ע"י lookup ישיר בטבלת prices לפי barcode במקום fuzzy על שם.
  barcode?: string;
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
    barcode: {
      type: String,
      trim: true,
      maxlength: 32,
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
// אינדקס דליל לברקוד - מאפשר חיפוש מהיר של "כל המוצרים עם ברקוד X" (היסטוריה)
productSchema.index({ barcode: 1 }, { sparse: true });

export const Product = mongoose.model<IProductDoc>('Product', productSchema);
