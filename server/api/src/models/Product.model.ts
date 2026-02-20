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

export const Product = mongoose.model<IProductDoc>('Product', productSchema);
